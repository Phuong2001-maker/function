$ErrorActionPreference = 'Stop'

$dirs = @('TR','UR','ZH-CN')
$skip = @('404.html','about.html','all-tools.html','blog.html','contact.html','faq.html','index.html','privacy.html','terms.html')

foreach ($dir in $dirs) {
  $allTools = Get-Content "$dir/all-tools.html" -Raw
  $headerTemplate = [regex]::Match($allTools, '<header[\s\S]*?</header>').Value
  $footerTemplate = [regex]::Match($allTools, '<footer[\s\S]*?</footer>').Value

  Get-ChildItem $dir -Filter '*.html' | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
    $path = $_.FullName
    $slug = $_.BaseName
    $raw = Get-Content $path -Raw

    $appIndex = $raw.IndexOf('<div class="app">')
    if ($appIndex -lt 0) { return }

    $head = $raw.Substring(0, $appIndex)
    $bodyContent = $raw.Substring($appIndex)

    if ($head -notmatch '</head>') { $head += "</head>`n" }
    if ($head -notmatch '../assets/css/style.css') {
      $pattern = '(<link rel="stylesheet" href="\.\./css/converter\.css">)'
      $replacement = "<link rel=""stylesheet"" href=""../assets/css/style.css"">`n  `$1"
      $head = [regex]::Replace($head, $pattern, $replacement, 1)
    }

    $bodyContent = [regex]::Replace($bodyContent, '<header class="site-header"[\s\S]*?</header>', '')
    $bodyContent = [regex]::Replace($bodyContent, '<footer class="site-footer"[\s\S]*?</footer>', '')
    $bodyContent = $bodyContent -replace '</body>', ''
    $bodyContent = $bodyContent -replace '</html>', ''
    $bodyContent = $bodyContent.Trim()

    $header = [regex]::Replace($headerTemplate, 'data-page="[^"]*"', "data-page=""$slug""", 1)

    $rebuilt = @"
$head
<body data-page="$slug">
  $header
  <main class="converter-shell">
$bodyContent
  </main>
  $footerTemplate
  <script src="../assets/js/main.js" defer></script>
</body>
</html>
"@

    # Remove any duplicate header/footer fragments
    $rebuilt = [regex]::Replace($rebuilt, '(?s)(<header class="site-header"[\s\S]*?</header>)[\s\S]*?(<header class="site-header"[\s\S]*?</header>)', '$1')
    $rebuilt = [regex]::Replace($rebuilt, '(?s)(<footer class="site-footer"[\s\S]*?</footer>)[\s\S]*?(<footer class="site-footer"[\s\S]*?</footer>)', '$1')

    Set-Content $path $rebuilt -Encoding utf8
  }
}
