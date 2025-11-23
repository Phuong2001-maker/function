$ErrorActionPreference = 'Stop'

$dirs = @('PT-BR','RU','TH','TR','UR','ZH-CN')
$skip = @('404.html','about.html','all-tools.html','blog.html','contact.html','faq.html','index.html','privacy.html','terms.html')

foreach ($dir in $dirs) {
  $allTools = Get-Content "$dir/all-tools.html" -Raw
  $headerTemplate = [regex]::Match($allTools, '<header[\s\S]*?</header>').Value
  $footerTemplate = [regex]::Match($allTools, '<footer[\s\S]*?</footer>').Value

  Get-ChildItem "$dir" -Filter '*.html' |
    Where-Object { $skip -notcontains $_.Name } |
    ForEach-Object {
      $path = $_.FullName
      $text = Get-Content $path -Raw
      $slug = $_.BaseName

      $headEnd = $text.IndexOf('</head>')
      if ($headEnd -lt 0) { return }
      $head = $text.Substring(0, $headEnd + 7)
      $body = $text.Substring($headEnd + 7)

      if ($head -notmatch '../assets/css/style.css') {
        $head = [regex]::Replace($head, '(<link rel="stylesheet" href="\.\./css/converter\.css">)', "<link rel=""stylesheet"" href=""../assets/css/style.css"">`n  `$1", 1)
      }

      $body = [regex]::Replace($body, '<header class="site-header"[\s\S]*?</header>', '')
      $body = [regex]::Replace($body, '<footer class="site-footer"[\s\S]*?</footer>', '')
      $body = $body -replace '<main class="converter-shell">', ''
      $body = $body -replace '</main>', ''
      $body = [regex]::Replace($body, '<script src="\.\./assets/js/main\.js" defer></script>', '')
      $body = $body -replace '(?i)<body[^>]*>', ''
      $body = $body -replace '(?i)</body>', ''
      $body = $body -replace '(?i)</html>', ''
      $body = $body.Trim()

      $contentPart = $body
      $scriptsPart = ''
      $splitIdx = [regex]::Match($body, '\n\s*<script')
      if ($splitIdx.Success) {
        $contentPart = $body.Substring(0, $splitIdx.Index).Trim()
        $scriptsPart = $body.Substring($splitIdx.Index).Trim()
      }

      $header = [regex]::Replace($headerTemplate, 'data-page="[^"]*"', "data-page=""$slug""", 1)

      $rebuilt = @()
      $rebuilt += $head
      $rebuilt += "<body data-page=""$slug"">"
      $rebuilt += "  $header"
      $rebuilt += '  <main class="converter-shell">'
      $rebuilt += $contentPart
      $rebuilt += '  </main>'
      $rebuilt += "  $footerTemplate"
      $rebuilt += '  <script src="../assets/js/main.js" defer></script>'
      if ($scriptsPart) { $rebuilt += $scriptsPart }
      $rebuilt += '</body>'
      $rebuilt += '</html>'

      Set-Content $path ($rebuilt -join "`n") -Encoding utf8
    }
}
