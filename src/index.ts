import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import express from 'express'
import Throttle from 'throttle'
import { Writable, PassThrough } from 'stream'
import { ffprobe, ffprobeSync } from '@dropb/ffprobe'
import ffprobeStatic from 'ffprobe-static'
import ffmpegStatic from 'ffmpeg-static'
import ffmpeg from 'fluent-ffmpeg'

dotenv.config()

ffmpeg.setFfmpegPath(ffmpegStatic!)
ffprobe.path = ffprobeStatic.path

console.log('Available files', fs.readdirSync(path.resolve(__dirname, '..', 'files')))

let currentSong = getRandomFile()
const writables: Writable[] = []

function playLoop(file: string) {
    console.log('playLoop', file)
    const filePath = path.resolve(__dirname, '..', 'files', file)
    const readable = fs.createReadStream(filePath)

    const fixedBitRate = 128000
    // let bitRate = 128000
    // try {
    //     const fileData = ffprobeSync(filePath)
    //     console.log('fileData', fileData)
    //     const parsedBitRate = fileData.format.bit_rate
    //     if (parsedBitRate)
    //         bitRate = parseInt(parsedBitRate)
    //     console.log('bitRate', bitRate)
    // } catch (error) {
    //     console.error('ffprobe error', error)
    // }
    
    const throttle = new Throttle(fixedBitRate / 8)
        .on('data', (chunk) => {
            broadcast(chunk)
        })
        .on('end', () => {
            let nextSong
            do {
                nextSong = getRandomFile()
            } while (nextSong === file)
            playLoop(nextSong)
        })
    
    // readable.pipe(throttle)
    
    ffmpeg(readable)
        .audioCodec('libmp3lame')
        .format('mp3')
        // All songs must have the same bit rate, frequency and channels
        .audioBitrate(fixedBitRate / 1000)
        .audioFrequency(44100)
        .audioChannels(2)
        // .outputOptions([
        //     '-c:a libmp3lame',    // Ensure using MP3 encoder
        //     '-b:a 128k',          // Set bitrate to 128k
        //     '-f mp3',             // Output format
        //     '-movflags frag_keyframe+empty_moov', // For smooth streaming
        //     '-ar 44100',          // Set audio rate to 44100 Hz
        //     '-ac 2',              // Set audio channels to stereo
        // ])
        .on('error', (err) => {
            console.error('ffmpeg error:', err)
        })
        .on('progress', (progress) => {
            // console.log('Processing:', progress)
        })
        .pipe(throttle)
}

function getRandomFile() {
    const files = fs.readdirSync(path.resolve(__dirname, '..', 'files'))
    const randomIndex = Math.floor(Math.random() * files.length)
    return files[randomIndex]
}

function broadcast(chunk: any) {
    for (const writable of writables) {
        writable.write(chunk)
    }
}

playLoop(currentSong)

const app = express()

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/stream', (req, res) => {
    
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Accept-Ranges', 'bytes')

    const writable = new PassThrough({
        // write(chunk, encoding, callback) {
        //     res.write(chunk)
        //     callback()
        // }
    })

    writable.pipe(res)

    writables.push(writable)

    console.log(`Listener connected. Ip: ${req.ip} Total listeners: ${writables.length}`)

    req.on('close', () => {
        const index = writables.indexOf(writable)
        if (index > -1) {
            writables.splice(index, 1)
        }
        console.log(`Listener disconnected. Ip: ${req.ip} Total listeners: ${writables.length}`)
    })
})

app.listen(process.env.PORT || 3000, () => {
    console.log(`Server is running on port ${process.env.PORT || 3000}`)
})
