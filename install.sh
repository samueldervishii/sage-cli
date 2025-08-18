#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project info
REPO="samueldervishi1/sophia-cli"
BINARY_NAME="sophia"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to get OS and architecture
get_platform() {
    local os=$(uname -s | tr '[:upper:]' '[:lower:]')
    local arch=$(uname -m)
    
    case $arch in
        x86_64|amd64) arch="x64" ;;
        aarch64|arm64) arch="arm64" ;;
        armv7l) arch="arm" ;;
        *) print_error "Unsupported architecture: $arch"; exit 1 ;;
    esac
    
    case $os in
        darwin) os="macos" ;;
        linux) os="linux" ;;
        mingw*|cygwin*|msys*) os="windows" ;;
        *) print_error "Unsupported OS: $os"; exit 1 ;;
    esac
    
    echo "${os}-${arch}"
}

# Function to check Node.js version
check_node() {
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js (version 14 or higher) first."
        print_status "Visit: https://nodejs.org/"
        exit 1
    fi
    
    local node_version=$(node --version | sed 's/v//' | cut -d. -f1)
    if [ "$node_version" -lt 14 ]; then
        print_error "Node.js version 14 or higher is required. Current version: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) found"
}

# Function to install from GitHub
install_from_github() {
    print_status "Installing Sophia CLI from GitHub..."
    
    local temp_dir=$(mktemp -d)
    local install_dir="$HOME/.local/bin"
    local sophia_dir="$install_dir/sophia-cli"
    
    # Create install directory if it doesn't exist
    mkdir -p "$install_dir"
    
    # Remove existing installation if it exists
    if [ -d "$sophia_dir" ]; then
        print_status "Removing existing installation..."
        rm -rf "$sophia_dir"
    fi
    
    # Download the repository
    print_status "Downloading from GitHub..."
    if command_exists curl; then
        curl -fsSL "https://github.com/$REPO/archive/main.tar.gz" | tar -xz -C "$temp_dir"
    elif command_exists wget; then
        wget -qO- "https://github.com/$REPO/archive/main.tar.gz" | tar -xz -C "$temp_dir"
    else
        print_error "Neither curl nor wget found. Please install one of them."
        exit 1
    fi
    
    # Navigate to extracted directory
    cd "$temp_dir/sophia-cli-main"
    
    # Install dependencies
    print_status "Installing dependencies..."
    if command_exists npm; then
        npm install --production --silent
    else
        print_error "npm is required but not found. Please install Node.js with npm."
        exit 1
    fi
    
    # Copy to install directory
    print_status "Installing to $sophia_dir..."
    cp -r . "$sophia_dir"
    
    # Create executable wrapper
    cat > "$install_dir/$BINARY_NAME" << EOF
#!/bin/bash
exec node "$sophia_dir/bin/sophia.mjs" "\$@"
EOF
    
    chmod +x "$install_dir/$BINARY_NAME"
    
    # Clean up
    rm -rf "$temp_dir"
    
    print_success "$BINARY_NAME installed to $install_dir/$BINARY_NAME"
    
    # Check if install_dir is in PATH
    if [[ ":$PATH:" != *":$install_dir:"* ]]; then
        print_warning "$install_dir is not in your PATH"
        print_status "Add this line to your shell profile (~/.bashrc, ~/.zshrc, or ~/.profile):"
        echo
        echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
        echo
        print_status "Then restart your terminal or run: source ~/.bashrc"
        print_status "Alternatively, you can run sophia with: $install_dir/$BINARY_NAME"
    fi
}

# Function to verify installation
verify_installation() {
    print_status "Verifying installation..."
    
    if command_exists $BINARY_NAME; then
        print_success "$BINARY_NAME is installed and available in PATH"
        print_status "Try running: $BINARY_NAME --help"
        return 0
    else
        local install_dir="$HOME/.local/bin"
        if [ -f "$install_dir/$BINARY_NAME" ]; then
            print_warning "$BINARY_NAME installed but not in PATH"
            print_status "You can run it with: $install_dir/$BINARY_NAME"
            return 0
        else
            print_error "Installation verification failed"
            return 1
        fi
    fi
}

# Function to setup PATH (optional)
setup_path() {
    local install_dir="$HOME/.local/bin"
    
    if [[ ":$PATH:" == *":$install_dir:"* ]]; then
        return 0
    fi
    
    local shell_profile=""
    if [ -n "$ZSH_VERSION" ]; then
        shell_profile="$HOME/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        shell_profile="$HOME/.bashrc"
    else
        shell_profile="$HOME/.profile"
    fi
    
    echo
    read -p "Would you like to automatically add $install_dir to your PATH? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> "$shell_profile"
        print_success "Added to PATH in $shell_profile"
        print_status "Please restart your terminal or run: source $shell_profile"
    fi
}

# Main installation function
main() {
    print_status "🤖 Installing Sophia CLI..."
    print_status "Platform: $(get_platform)"
    
    # Check prerequisites
    check_node
    
    # Install from GitHub
    install_from_github
    
    # Verify installation
    if verify_installation; then
        setup_path
        print_success "🎉 Installation completed successfully!"
        print_status "Run '$BINARY_NAME --help' to get started"
    else
        print_error "Installation verification failed. Please check the installation manually."
        exit 1
    fi
}

# Handle Ctrl+C
trap 'print_error "Installation interrupted"; exit 1' INT

# Run main function
main "$@"