// convert all files from the convert folder to mp3 and store in the files folder

import fs from 'fs'
import path from 'path'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'

ffmpeg.setFfmpegPath(ffmpegStatic!)

const convertFolder = path.resolve(__dirname, 'convert')

const files = fs.readdirSync(convertFolder)

// files.forEach(file => {
//     const filePath = path.resolve(convertFolder, file)
//     const fileName = path.parse(file).name
//     const fileExtension = path.parse(file).ext
//     const mp3FilePath = path.resolve(__dirname, 'files', `${fileName}.mp3`)

//     ffmpeg(filePath)
//         .audioCodec('libmp3lame')
//         .format('mp3')
//         .audioBitrate(128)
//         .audioFrequency(44100)
//         .audioChannels(2)
//         .on('end', () => {
//             console.log('File converted', mp3FilePath)
//             fs.unlinkSync(filePath)
//         })
//         .save(mp3FilePath)
// })

function convert(file: string) {
    const filePath = path.resolve(convertFolder, file)
    const fileName = path.parse(file).name
    const fileExtension = path.parse(file).ext
    const mp3FilePath = path.resolve(__dirname, 'files', `${fileName}.mp3`)

    ffmpeg(filePath)
        .audioCodec('libmp3lame')
        .format('mp3')
        .audioBitrate(128)
        .audioFrequency(44100)
        .audioChannels(2)
        .on('end', () => {
            console.log('File converted', mp3FilePath)
            fs.unlinkSync(filePath)
            const nextFile = files.shift()
            if (nextFile)
                convert(nextFile)
            else
                console.log('All files converted')
        })
        .save(mp3FilePath)
}

const file = files.shift()

if (file)
    convert(file)
else
    console.log('No files to convert')
