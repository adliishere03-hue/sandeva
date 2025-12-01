require("./config.js")
const chalk = require('chalk')
const gradient = require('gradient-string')
const figlet = require('figlet')
const boxen = require("boxen").default;
const moment = require('moment')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    makeInMemoryStore,
    jidDecode,
    downloadContentFromMessage
} = require("@whiskeysockets/baileys");
const pino = require("pino");
const fs = require('fs')
const path = require('path')
const { Boom } = require("@hapi/boom");
const PhoneNumber = require("awesome-phonenumber");
const fetch = require('node-fetch')
const FileType = require('file-type')
const readline = require("readline");
const { smsg, imageToWebp, videoToWebp, writeExifImg, writeExifVid, writeExif, toPTT, toAudio, toVideo } = require("./lib/myfunc")

const store = makeInMemoryStore({ logger: pino().child({ level: "silent", stream: "store" }) });
const question = (text) => { const rl = readline.createInterface({ input: process.stdin, output: process.stdout }); return new Promise((resolve) => { rl.question(text, resolve) }) };

// ================== DISPLAY & LOGGER KEREN ==================

function showBanner() {
    const logoText = figlet.textSync('SANDEVA IS HERE', {
        font: 'Standard',
        horizontalLayout: 'default',
        verticalLayout: 'default'
    })

    console.clear()
    console.log(gradient.pastel.multiline(logoText))
    console.log(
        boxen(
            [
                chalk.cyan('> Developer   : ') + chalk.white('Sandeva'),
                chalk.cyan('> Fungsi Bot  : ') + chalk.white('Panel Installer,Domain & Create Nokos'),
                chalk.cyan('') + chalk.white(''),
                chalk.cyan('> Thanks To   : ') + chalk.green('Danz Nano ( Base ) '),
                chalk.cyan('>') + chalk.white('Clarissa'),
                chalk.cyan('>') + chalk.white('RaflyShop'),
                chalk.cyan('>') + chalk.white('BaeciStore'),
            ].join('\n'),
            {
                padding: 1,
                borderColor: 'cyan',
                borderStyle: 'round',
                title: ' SANDEVA CONSOLE ',
                titleAlignment: 'center'
            }
        )
    )
    console.log('\n')
}

const logTime = () => chalk.gray(moment().format('YYYY-MM-DD HH:mm:ss'))

const Log = {
    info: (msg) =>
        console.log(`${logTime()} ${chalk.cyan('[INFO]')}  ${chalk.white(msg)}`),
    warn: (msg) =>
        console.log(`${logTime()} ${chalk.yellow('[WARN]')}  ${chalk.yellow(msg)}`),
    error: (msg) =>
        console.log(`${logTime()} ${chalk.red('[ERROR]')} ${chalk.red(msg)}`),
    event: (msg) =>
        console.log(`${logTime()} ${chalk.magenta('[EVENT]')} ${chalk.magenta(msg)}`),
}

showBanner()

// ================== GLOBAL STATE ==================
let globalSocket = null          // untuk cegah multiple instance
let isReconnecting = false
let reconnectTimeout = null
let lastNotify = 0               // anti-spam notif ke owner

// ================== SAFE RECONNECT ==================
function safeReconnect() {
    if (isReconnecting) return
    isReconnecting = true

    Log.info('⏳ Menunggu 5 detik sebelum reconnect...')

    if (reconnectTimeout) clearTimeout(reconnectTimeout)

    reconnectTimeout = setTimeout(() => {
        Log.info('🔄 Reconnecting bot...')

        // matikan socket lama dulu biar nggak dobel
        if (globalSocket) {
            try { globalSocket.end() } catch { }
        }

        startBotz()
        isReconnecting = false
    }, 5000)
}

// ================== START BOT ==================
async function startBotz() {
    const { state, saveCreds } = await useMultiFileAuthState("session")

    const sandevaDev = makeWASocket({
        logger: pino({ level: "silent" }),
        printQRInTerminal: false,
        auth: state,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000,
        emitOwnEvents: true,
        fireInitQueries: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: true,
        markOnlineOnConnect: true,
        browser: ["Ubuntu", "Chrome", "20.0.04"],
    })

    // simpan ke global supaya bisa di-end saat reconnect
    globalSocket = sandevaDev

    if (!sandevaDev.authState.creds.registered) {
        const phoneNumber = await question('ᴍᴀꜱᴜᴋᴀɴ ɴᴏᴍᴇʀ ʏᴀɴɢ ᴀᴋᴛɪꜰ ᴀᴡᴀʟɪ ᴅᴇɴɢᴀɴ 62 ʀᴇᴄᴏᴅᴇ :\n');
        let code = await sandevaDev.requestPairingCode(phoneNumber);
        code = code?.match(/.{1,4}/g)?.join("-") || code;
        console.log(
            boxen(
                `${chalk.white('ᴋᴏᴅᴇ ᴘᴀɪʀɪɴɢ ʟᴜ ɴɪʜ ᴋᴏɴᴛᴏʟ :')} ${chalk.green(code)}`,
                {
                    padding: 1,
                    borderColor: 'green',
                    borderStyle: 'round',
                    title: ' PAIRING CODE ',
                    titleAlignment: 'center'
                }
            )
        )
    }

    store.bind(sandevaDev.ev);

    // ================== CONNECTION HANDLER ==================
    sandevaDev.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update

        if (connection === 'close') {
            let reason
            try {
                reason = new Boom(lastDisconnect?.error)?.output?.statusCode
            } catch {
                reason = undefined
            }

            Log.warn(`Connection closed with reason: ${reason}`)

            if (
                reason === DisconnectReason.badSession ||
                reason === DisconnectReason.connectionClosed ||
                reason === DisconnectReason.connectionLost ||
                reason === DisconnectReason.connectionReplaced ||
                reason === DisconnectReason.restartRequired ||
                reason === DisconnectReason.timedOut
            ) {
                safeReconnect()

            } else if (reason === 503) {
                Log.warn('Server WA lagi gangguan (503), coba reconnect pelan-pelan...')
                safeReconnect()

            } else if (reason === DisconnectReason.loggedOut) {
                Log.error('Session logged out, hapus folder session dan pairing ulang.')
                try { sandevaDev.end() } catch { }

            } else if (reason === 440) {
                Log.error('❌ Error 440: WhatsApp menolak koneksi. Bot dihentikan sementara.')
                Log.error('⚠️ Solusi: tunggu beberapa menit atau hapus folder session lalu pairing ulang.')
                try { sandevaDev.end() } catch { }

            } else {
                Log.error(`Unknown DisconnectReason: ${reason} | ${connection}`)
                try { sandevaDev.end() } catch { }
            }

        } else if (connection === 'connecting') {
            Log.info('⏳ Bot sedang mencoba tersambung...')

        } else if (connection === 'open') {
            Log.event(`Tersambung sebagai ${chalk.green(JSON.stringify(sandevaDev.user.id))}`)

            try {
                const now = Date.now()

                // anti-spam: maksimal notif 1x per 5 menit
                if (now - lastNotify > 5 * 60 * 1000) {
                    lastNotify = now

                    await sandevaDev.sendMessage(
                        '62882022761318@s.whatsapp.net',
                        {
                            text:
                                `🚀 *HALO BANG SANDEVA BOT SUDAH CONNECT!!!*\n\n` +
                                `📍 Status : *ONLINE*\n` +
                                `🕒 Waktu  : *${new Date().toLocaleString("id-ID")}*\n\n` +
                                `Bot sudah berjalan dengan normal.`
                        }
                    )
                    console.log('📩 Notifikasi terkirim ke Sandeva')
                } else {
                    console.log('⏳ Notifikasi owner di-skip (anti spam)')
                }
            } catch (err) {
                console.log('❗ Gagal kirim pesan ke owner:', err)
            }
        }
    });

    // ================== MESSAGE HANDLER ==================
    sandevaDev.ev.on("messages.upsert", async (chatUpdate) => {
        try {
            let mek = chatUpdate.messages[0];
            if (!mek.message) return;
            mek.message = Object.keys(mek.message)[0] === "ephemeralMessage"
                ? mek.message.ephemeralMessage.message
                : mek.message;
            if (mek.key && mek.key.remoteJid === "status@broadcast") return;
            if (!sandevaDev.public && !mek.key.fromMe && chatUpdate.type === "notify") return;
            if (mek.key.id.startsWith("BAE5") && mek.key.id.length === 16) return;
            let m = smsg(sandevaDev, mek, store);
            require("./case")(sandevaDev, m, chatUpdate, store);
        } catch (err) {
            Log.error(err)
        }
    });

    // ================== UTIL FUNCS ==================
    sandevaDev.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + "@" + decode.server) || jid;
        } else return jid;
    };

    sandevaDev.getName = (jid, withoutContact = false) => {
        id = sandevaDev.decodeJid(jid);
        withoutContact = sandevaDev.withoutContact || withoutContact;
        let v;
        if (id.endsWith("@g.us"))
            return new Promise(async (resolve) => {
                v = store.contacts[id] || {};
                if (!(v.name || v.subject)) v = sandevaDev.groupMetadata(id) || {};
                resolve(v.name || v.subject || PhoneNumber("+" + id.replace("@s.whatsapp.net", "")).getNumber("international"));
            });
        else
            v =
                id === "0@s.whatsapp.net"
                    ? {
                        id,
                        name: "WhatsApp",
                    }
                    : id === sandevaDev.decodeJid(sandevaDev.user.id)
                        ? sandevaDev.user
                        : store.contacts[id] || {};
        return (withoutContact ? "" : v.name) || v.subject || v.verifiedName || PhoneNumber("+" + jid.replace("@s.whatsapp.net", "")).getNumber("international");
    };

    sandevaDev.public = true;

    sandevaDev.ev.on("creds.update", saveCreds);

    sandevaDev.sendText = (jid, text, quoted = "", options) =>
        sandevaDev.sendMessage(jid, { text: text, ...options }, { quoted });

    sandevaDev.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(message, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    sandevaDev.sendImageAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifImg(buff, options);
        } else {
            buffer = await imageToWebp(buff);
        }
        await sandevaDev.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    sandevaDev.sendVideoAsSticker = async (jid, path, quoted, options = {}) => {
        let buff = Buffer.isBuffer(path) ? path : /^data:.*?\/.*?;base64,/i.test(path) ? Buffer.from(path.split`,`[1], 'base64') : /^https?:\/\//.test(path) ? await (await getBuffer(path)) : fs.existsSync(path) ? fs.readFileSync(path) : Buffer.alloc(0);
        let buffer;
        if (options && (options.packname || options.author)) {
            buffer = await writeExifVid(buff, options);
        } else {
            buffer = await videoToWebp(buff);
        }
        await sandevaDev.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
        return buffer;
    };

    sandevaDev.getFile = async (PATH, returnAsFilename) => {
        let res, filename
        const data = Buffer.isBuffer(PATH) ? PATH : /^data:.*?\/.*?;base64,/i.test(PATH) ? Buffer.from(PATH.split`,`[1], 'base64') : /^https?:\/\//.test(PATH) ? await (res = await fetch(PATH)).buffer() : fs.existsSync(PATH) ? (filename = PATH, fs.readFileSync(PATH)) : typeof PATH === 'string' ? PATH : Buffer.alloc(0)
        if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')
        const type = await FileType.fromBuffer(data) || {
            mime: 'application/octet-stream',
            ext: '.bin'
        }
        if (data && returnAsFilename && !filename) (filename = path.join(__dirname, './tmp/' + new Date * 1 + '.' + type.ext), await fs.promises.writeFile(filename, data))
        return {
            res,
            filename,
            ...type,
            data,
            deleteFile() {
                return filename && fs.promises.unlink(filename)
            }
        }
    }

    sandevaDev.sendFile = async (jid, path, filename = '', caption = '', quoted, ptt = false, options = {}) => {
        let type = await sandevaDev.getFile(path, true)
        let { res, data: file, filename: pathFile } = type
        if (res && res.status !== 200 || file.length <= 65536) {
            try { throw { json: JSON.parse(file.toString()) } }
            catch (e) { if (e.json) throw e.json }
        }
        let opt = { filename }
        if (quoted) opt.quoted = quoted
        if (!type) options.asDocument = true
        let mtype = '', mimetype = type.mime, convert
        if (/webp/.test(type.mime) || (/image/.test(type.mime) && options.asSticker)) mtype = 'sticker'
        else if (/image/.test(type.mime) || (/webp/.test(type.mime) && options.asImage)) mtype = 'image'
        else if (/video/.test(type.mime)) mtype = 'video'
        else if (/audio/.test(type.mime)) (
            convert = await (ptt ? toPTT : toAudio)(file, type.ext),
            file = convert.data,
            pathFile = convert.filename,
            mtype = 'audio',
            mimetype = 'audio/ogg; codecs=opus'
        )
        else mtype = 'document'
        if (options.asDocument) mtype = 'document'

        let message = {
            ...options,
            caption,
            ptt,
            [mtype]: { url: pathFile },
            mimetype
        }
        let m
        try {
            m = await sandevaDev.sendMessage(jid, message, { ...opt, ...options })
        } catch (e) {
            console.error(e)
            m = null
        } finally {
            if (!m) m = await sandevaDev.sendMessage(jid, { ...message, [mtype]: file }, { ...opt, ...options })
            return m
        }
    }

    sandevaDev.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.m ? message.m : message
        let mime = (message.m || message).mimetype || ''
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0]
        const stream = await downloadContentFromMessage(quoted, messageType)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        let type = await FileType.fromBuffer(buffer)
        trueFileName = attachExtension ? (filename + '.' + type.ext) : filename
        // save to file
        await fs.writeFileSync(trueFileName, buffer)
        return trueFileName
    }

    return sandevaDev;
}

// ================== STARTUP ==================
startBotz();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log(`Update ${__filename}`);
    delete require.cache[file];
    require(file);
});
