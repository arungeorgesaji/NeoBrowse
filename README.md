# NeoBrowse - Terminal Web Browser 
![NeoBrowse Screenshot](screenshot.png) 

A lightweight, web browser for the terminal, built with Node.js and Blessed.

## Features
- Terminal-native interface with keyboard navigation
- Fast rendering of simplified HTML content
- Bookmarks management
- Browsing history
- Multiple tabs support
- Integrated URL/search bar

## Installation & Usage

### Local Installation
```bash
git clone https://github.com/arungeorgesaji/NeoBrowse.git
cd NeoBrowse
npm install
npm start
```

### Docker Installation
```bash
git clone https://github.com/arungeorgesaji/NeoBrowse.git
cd NeoBrowse
docker build -t neobrowse . 
docker run -it --rm \
  -v "$HOME/my_bookmarks:/app/data" \
  -e "HOME=/app/data" \
  neobrowse
```
