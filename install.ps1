# Sage CLI PowerShell Installer
# Compatible with PowerShell 5.1+ and PowerShell Core

param(
    [switch]$Force,
    [switch]$AddToPath = $true
)

$REPO = "samueldervishii/sage-cli"
$BINARY_NAME = "sage"

function Write-Status { 
    param([string]$Message)
    Write-Host "[INFO]    " -ForegroundColor Blue -NoNewline
    Write-Host $Message 
}

function Write-Success { 
    param([string]$Message)
    Write-Host "[SUCCESS] " -ForegroundColor Green -NoNewline
    Write-Host $Message 
}

function Write-Warning { 
    param([string]$Message)
    Write-Host "[WARNING] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message 
}

function Write-Error { 
    param([string]$Message)
    Write-Host "[ERROR]   " -ForegroundColor Red -NoNewline
    Write-Host $Message 
}

# Function to check if command exists
function Test-Command {
    param([string]$Command)
    
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Get-Platform {
    $arch = $env:PROCESSOR_ARCHITECTURE
    
    switch ($arch) {
        "AMD64" { $arch = "x64" }
        "ARM64" { $arch = "arm64" }
        "x86" { $arch = "x86" }
        default { 
            Write-Error "Unsupported architecture: $arch"
            exit 1
        }
    }
    
    return "windows-$arch"
}

function Test-Node {
    if (!(Test-Command "node")) {
        Write-Error "Node.js is not installed. Please install Node.js (version 14 or higher) first."
        Write-Status "Visit: https://nodejs.org/"
        exit 1
    }
    
    $nodeVersionOutput = node --version
    $nodeVersion = [int]($nodeVersionOutput -replace "v(\d+)\..*", '$1')
    
    if ($nodeVersion -lt 14) {
        Write-Error "Node.js version 14 or higher is required. Current version: $nodeVersionOutput"
        exit 1
    }
    
    Write-Success "Node.js $nodeVersionOutput found"
}

function Install-FromGitHub {
    Write-Status "Installing Sage CLI from GitHub..."
    
    $tempDir = Join-Path $env:TEMP ([System.Guid]::NewGuid().ToString())
    $installDir = Join-Path $env:LOCALAPPDATA "sage-cli\bin"
    $sageDir = Join-Path $env:LOCALAPPDATA "sage-cli"
    
    try {
        New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        
        if (Test-Path $sageDir -and (Test-Path $sageDir -PathType Container)) {
            Write-Status "Removing existing installation..."
            Remove-Item $sageDir -Recurse -Force
        }
        
        Write-Status "Downloading from GitHub..."
        $downloadUrl = "https://github.com/$REPO/archive/main.zip"
        $zipFile = Join-Path $tempDir "sage-cli-main.zip"
        
        if (Test-Command "curl") {
            & curl -fsSL $downloadUrl -o $zipFile
        } elseif ($PSVersionTable.PSVersion.Major -ge 3) {
            Invoke-WebRequest -Uri $downloadUrl -OutFile $zipFile
        } else {
            Write-Error "Unable to download. Please install curl or upgrade PowerShell."
            exit 1
        }
        
        Write-Status "Extracting archive..."
        if ($PSVersionTable.PSVersion.Major -ge 5) {
            Expand-Archive -Path $zipFile -DestinationPath $tempDir -Force
        } else {
            Add-Type -AssemblyName System.IO.Compression.FileSystem
            [System.IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $tempDir)
        }
        
        $extractedDir = Join-Path $tempDir "sage-cli-main"
        
        Write-Status "Installing dependencies..."
        if (!(Test-Command "npm")) {
            Write-Error "npm is required but not found. Please install Node.js with npm."
            exit 1
        }
        
        Push-Location $extractedDir
        try {
            & npm install --production --silent
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed"
            }
        } finally {
            Pop-Location
        }
        
        Write-Status "Installing to $sageDir..."
        Copy-Item -Path "$extractedDir\*" -Destination $sageDir -Recurse -Force
        
        $batchContent = @"
@echo off
node "$sageDir\bin\sage.mjs" %*
"@
        $batchPath = Join-Path $installDir "$BINARY_NAME.cmd"
        Set-Content -Path $batchPath -Value $batchContent -Encoding ASCII
        
        Write-Success "$BINARY_NAME installed to $batchPath"
        
        return @{
            InstallDir = $installDir
            BinaryPath = $batchPath
            SageDir = $sageDir
        }
        
    } finally {
        if (Test-Path $tempDir) {
            Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

function Test-Installation {
    param(
        [string]$InstallDir,
        [string]$BinaryPath
    )
    
    Write-Status "Verifying installation..."
    
    if (Test-Command $BINARY_NAME) {
        Write-Success "$BINARY_NAME is installed and available in PATH"
        Write-Status "Try running: $BINARY_NAME --help"
        return $true
    } elseif (Test-Path $BinaryPath) {
        Write-Warning "$BINARY_NAME installed but not in PATH"
        Write-Status "You can run it with: $BinaryPath"
        return $true
    } else {
        Write-Error "Installation verification failed"
        return $false
    }
}

function Add-ToPath {
    param([string]$InstallDir)
    
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    
    if ($currentPath -split ";" -contains $InstallDir) {
        Write-Status "$InstallDir is already in PATH"
        return
    }
    
    Write-Warning "$InstallDir is not in your PATH"
    
    if ($AddToPath -and !$Force) {
        $response = Read-Host "Would you like to add $InstallDir to your PATH? (y/N)"
        if ($response -match "^[Yy]") {
            $AddToPath = $true
        } else {
            $AddToPath = $false
        }
    }
    
    if ($AddToPath) {
        try {
            $newPath = "$currentPath;$InstallDir"
            [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
            Write-Success "Added to PATH. Please restart your terminal."
        } catch {
            Write-Error "Failed to add to PATH: $_"
            Write-Status "You can manually add this to your PATH: $InstallDir"
        }
    } else {
        Write-Status "Skipped adding to PATH. You can run sage with the full path:"
        Write-Status "  $InstallDir\$BINARY_NAME.cmd"
    }
}

function Install-SageCLI {
    try {
        Write-Status "Installing Sage CLI..."
        Write-Status "Platform: $(Get-Platform)"
        Test-Node
        
        $result = Install-FromGitHub
        
        if (Test-Installation -InstallDir $result.InstallDir -BinaryPath $result.BinaryPath) {
            Add-ToPath -InstallDir $result.InstallDir
            Write-Success "Installation completed successfully!"
            Write-Status "Run '$BINARY_NAME setup' to configure API keys"
            Write-Status "Then run '$BINARY_NAME' to start using Sage CLI"
        } else {
            Write-Error "Installation verification failed. Please check the installation manually."
            exit 1
        }
        
    } catch {
        Write-Error "Installation failed: $($_.Exception.Message)"
        exit 1
    }
}

$null = Register-EngineEvent PowerShell.Exiting -Action {
    Write-Error "Installation interrupted"
}

if ($args -contains "-h" -or $args -contains "--help" -or $args -contains "/?") {
    Write-Host @"
Sage CLI PowerShell Installer

Usage: .\install.ps1 [OPTIONS]

Options:
    -Force        Skip confirmation prompts
    -AddToPath    Automatically add to PATH (default: true)
    -h, --help    Show this help message

Examples:
    .\install.ps1                    # Interactive installation
    .\install.ps1 -Force             # Silent installation
    .\install.ps1 -AddToPath:`$false   # Don't add to PATH
"@
    exit 0
}

Install-SageCLI