Add-Type -AssemblyName System.Drawing

$buildDir = "c:\Users\sayem\LocAI\build"
if (!(Test-Path $buildDir)) {
    New-Item -ItemType Directory -Path $buildDir -Force | Out-Null
}

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.Clear([System.Drawing.Color]::Transparent)

# 1. Background rounded rectangle (Squircle)
$rect = New-Object System.Drawing.Rectangle 16, 16, 480, 480
$radius = 110

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddArc(16, 16, $radius, $radius, 180, 90)
$path.AddArc(496 - $radius, 16, $radius, $radius, 270, 90)
$path.AddArc(496 - $radius, 496 - $radius, $radius, $radius, 0, 90)
$path.AddArc(16, 496 - $radius, $radius, $radius, 90, 90)
$path.CloseFigure()

# Dark obsidian / violet gradient fill
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 16, 16),
    (New-Object System.Drawing.Point 496, 496),
    [System.Drawing.Color]::FromArgb(255, 17, 19, 34),
    [System.Drawing.Color]::FromArgb(255, 30, 27, 75)
)
$g.FillPath($brush, $path)

# Subtle glowing border
$borderPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(180, 99, 102, 241), 8)
$g.DrawPath($borderPen, $path)

# Inner soft radial glow
$glowBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($path)
$glowBrush.CenterColor = [System.Drawing.Color]::FromArgb(60, 129, 140, 248)
$glowBrush.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 17, 19, 34))
$g.FillPath($glowBrush, $path)

# 2. Draw modern AI Sparkle / Chat Star Emblem
function DrawSparkle($graphics, $cx, $cy, $radius, $color, $innerColor) {
    $spPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $pts = @()
    for ($i = 0; $i -lt 8; $i++) {
        $angle = $i * [Math]::PI / 4
        $r = if ($i % 2 -eq 0) { $radius } else { $radius * 0.28 }
        $px = $cx + [Math]::Cos($angle) * $r
        $py = $cy + [Math]::Sin($angle) * $r
        $pts += New-Object System.Drawing.PointF ([float]$px), ([float]$py)
    }
    $spPath.AddPolygon($pts)
    
    $pBrush = New-Object System.Drawing.Drawing2D.PathGradientBrush($spPath)
    $pBrush.CenterColor = $innerColor
    $pBrush.SurroundColors = @($color)
    $graphics.FillPath($pBrush, $spPath)
}

# Main center star
DrawSparkle $g 256 256 160 ([System.Drawing.Color]::FromArgb(255, 99, 102, 241)) ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
# Inner brilliant core
DrawSparkle $g 256 256 85 ([System.Drawing.Color]::FromArgb(255, 165, 180, 252)) ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

# Secondary decorative mini sparkles (AI intelligence cluster)
DrawSparkle $g 375 145 42 ([System.Drawing.Color]::FromArgb(255, 56, 189, 248)) ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
DrawSparkle $g 135 365 32 ([System.Drawing.Color]::FromArgb(255, 192, 132, 252)) ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))

# Discrete orbital nodes
$nodePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(100, 165, 180, 252), 3)
$nodePen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dot
$g.DrawEllipse($nodePen, 156, 156, 200, 200)

$pngPath = Join-Path $buildDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved PNG: $pngPath"

# 3. Create Windows 256x256 multi-icon / ICO format
$bmp256 = New-Object System.Drawing.Bitmap $bmp, 256, 256
$ms = New-Object System.IO.MemoryStream
$bmp256.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
$pngBytes = $ms.ToArray()
$ms.Close()

$icoPath = Join-Path $buildDir "icon.ico"
$bw = New-Object System.IO.BinaryWriter(New-Object System.IO.FileStream($icoPath, [System.IO.FileMode]::Create))

# ICONDIR header: idReserved (0), idType (1 = ICO), idCount (1)
$bw.Write([uint16]0)
$bw.Write([uint16]1)
$bw.Write([uint16]1)

# ICONDIRENTRY:
# bWidth (0 = 256), bHeight (0 = 256), bColorCount (0), bReserved (0)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([byte]0)
$bw.Write([byte]0)
# wPlanes (1), wBitCount (32)
$bw.Write([uint16]1)
$bw.Write([uint16]32)
# dwBytesInRes, dwImageOffset (6 + 16 = 22)
$bw.Write([uint32]$pngBytes.Length)
$bw.Write([uint32]22)

# PNG payload
$bw.Write($pngBytes)
$bw.Flush()
$bw.Close()

Write-Output "Saved ICO: $icoPath"
