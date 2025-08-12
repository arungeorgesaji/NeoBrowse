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

## Quick Start (Recommended)

Run NeoBrowse instantly using Docker - no installation needed:

```bash
docker pull arunchess/neobrowse:latest && \
docker run -it --rm \
  -v "$HOME/my_bookmarks:/app/data" \
  -e "HOME=/app/data" \
  arunchess/neobrowse
```

### Local Installation

If you prefer to run NeoBrowse locally, run the following commands:

```bash
git clone https://github.com/arungeorgesaji/NeoBrowse.git
cd NeoBrowse
npm install
npm start
```
