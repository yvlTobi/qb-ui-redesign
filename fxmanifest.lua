-- Credits: nerd developer
-- websiet: nertd-developer.com

fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'qb-ui'
description 'On-screen interaction hint (DrawText NUI)'
version '1.0.0'

shared_scripts {
    'config.lua',
}

client_scripts {
    'client/main.lua',
}

ui_page 'html/index.html'

files {
    'html/index.html',
    'html/css/ui.css',
    'html/js/ui.js',
    -- legacy (kept for fallback; no longer referenced by index.html)
    'html/css/drawtext.css',
    'html/js/drawtext.js',
}
