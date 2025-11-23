$ErrorActionPreference = 'Stop'

$dirs = @('PT-BR','RU','TH')
$skip = @('404.html','about.html','all-tools.html','blog.html','contact.html','faq.html','index.html','privacy.html','terms.html')

foreach ($dir in $dirs) {
  $allTools = Get-Content "$dir/all-tools.html" -Raw
  $headerTemplate = [regex]::Match($allTools, '<header[\s\S]*?</header>').Value
  $footerTemplate = [regex]::Match($allTools, '<footer[\s\S]*?</footer>').Value

  Get-ChildItem $dir -Filter '*.html' | Where-Object { $skip -notcontains $_.Name } | ForEach-Object {
    $path = $_.FullName
    $slug = $_.BaseName
    $raw = Get-Content $path -Raw

    $headMatch = [regex]::Match($raw, '(?is)<head[\s\S]*?</head>')
    if (-not $headMatch.Success) { return }
    $head = $headMatch.Value

    if ($head -notmatch '../assets/css/style.css') {
      $head = [regex]::Replace($head, '(<link rel="stylesheet" href="\.\./css/converter\.css">)', "<link rel=""stylesheet"" href=""../assets/css/style.css"">`n  `$1", 1)
    }

    $pre = $raw.Substring(0, $headMatch.Index)

    $bodyInner = ''
    $bodyMatch = [regex]::Match($raw, '(?is)<body[^>]*>([\s\S]*?)</body>')
    if ($bodyMatch.Success) {
      $bodyInner = $bodyMatch.Groups[1].Value
    } else {
      $bodyInner = $raw.Substring($headMatch.Index + $headMatch.Length)
    }

    $bodyInner = [regex]::Replace($bodyInner, '<header class="site-header"[\s\S]*?</header>', '')
    $bodyInner = [regex]::Replace($bodyInner, '<footer class="site-footer"[\s\S]*?</footer>', '')
    $bodyInner = $bodyInner -replace '<main class="converter-shell">', ''
    $bodyInner = $bodyInner -replace '</main>', ''
    $bodyInner = [regex]::Replace($bodyInner, '<script src="\.\./assets/js/main\.js" defer></script>', '')
    $bodyInner = $bodyInner -replace '(?is)</html>', ''
    $bodyInner = $bodyInner.Trim()

    $header = [regex]::Replace($headerTemplate, 'data-page="[^"]*"', "data-page=""$slug""", 1)

    $rebuilt = @()
    $rebuilt += $pre
    $rebuilt += $head
    $rebuilt += "<body data-page=""$slug"">"
    $rebuilt += "  $header"
    $rebuilt += '  <main class="converter-shell">'
    $rebuilt += $bodyInner
    $rebuilt += '  </main>'
    $rebuilt += "  $footerTemplate"
    $rebuilt += '  <script src="../assets/js/main.js" defer></script>'
    $rebuilt += '</body>'
    $rebuilt += '</html>'

    Set-Content $path ($rebuilt -join "`n") -Encoding utf8
  }
}
