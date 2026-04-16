local function hideText()
    SendNUIMessage({
        action = 'HIDE_TEXT',
    })
end

local function resolvePosition(fromExport)
    local dt = Config.DrawText
    if not dt then return 'bottom-center' end
    if dt.useExportPosition and type(fromExport) == 'string' and fromExport ~= '' then
        return fromExport
    end
    if type(dt.placement) == 'string' and dt.placement ~= '' then
        return dt.placement
    end
    return 'bottom-center'
end

local function drawText(text, position)
    SendNUIMessage({
        action = 'DRAW_TEXT',
        data = {
            text = text,
            position = resolvePosition(position),
        }
    })
end

local function changeText(text, position)
    SendNUIMessage({
        action = 'CHANGE_TEXT',
        data = {
            text = text,
            position = resolvePosition(position),
        }
    })
end

local function keyPressed()
    CreateThread(function()
        SendNUIMessage({
            action = 'KEY_PRESSED',
        })
        Wait(500)
        hideText()
    end)
end

RegisterNUICallback('getDrawTextConfig', function(_, cb)
    cb(Config.DrawText or {})
end)

RegisterNetEvent('qb-core:client:DrawText', function(text, position)
    drawText(text, position)
end)

RegisterNetEvent('qb-core:client:ChangeText', function(text, position)
    changeText(text, position)
end)

RegisterNetEvent('qb-core:client:HideText', function()
    hideText()
end)

RegisterNetEvent('qb-core:client:KeyPressed', function()
    keyPressed()
end)

RegisterNetEvent('qb-ui:client:DrawText', function(text, position)
    drawText(text, position)
end)

RegisterNetEvent('qb-ui:client:ChangeText', function(text, position)
    changeText(text, position)
end)

RegisterNetEvent('qb-ui:client:HideText', function()
    hideText()
end)

RegisterNetEvent('qb-ui:client:KeyPressed', function()
    keyPressed()
end)

exports('DrawText', drawText)
exports('ChangeText', changeText)
exports('HideText', hideText)
exports('KeyPressed', keyPressed)
