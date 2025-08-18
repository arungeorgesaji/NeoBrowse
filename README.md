# NeoBrowse - TUI Web Browser 
![NeoBrowse Screenshot](screenshot.png) 

A powerful terminal-based browser with a TUI interface, built with Node.js and Blessed.

## Features
- TUI interface with keyboard navigation
- Fast rendering of simplified HTML content
- Multiple tabs support
- Integrated URL/search bar (Even supports urlFragments and files)
- Bookmarks management
- Browsing history
- Customizable settings
- Advanced inbuilt debugger and warnings system 
- More advanced features coming soon!

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
