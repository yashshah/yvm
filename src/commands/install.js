const fs = require('fs')
const path = require('path')
const request = require('request')
const targz = require('targz')

const log = require('../util/log')
const {
    versionRootPath,
    getExtractionPath,
    getVersionsFromTags,
    yvmPath,
} = require('../util/utils')

const getDownloadPath = (version, rootPath) =>
    path.resolve(rootPath, 'versions', `v${version}.tar.gz`)

const getUrl = version =>
    `https://yarnpkg.com/downloads/${version}/yarn-v${version}.tar.gz`

const checkForVersion = (version, rootPath) => {
    const versionPath = getExtractionPath(version, rootPath)
    return fs.existsSync(versionPath)
}

const downloadVersion = (version, rootPath) => {
    const url = getUrl(version)
    const filePath = getDownloadPath(version, rootPath)
    const file = fs.createWriteStream(filePath)

    return new Promise((resolve, reject) => {
        const stream = request.get(url).pipe(file)
        stream.on('finish', () => resolve())
        stream.on('error', err => {
            reject(new Error(err))
        })
    })
}

const extractYarn = (version, rootPath) => {
    const destPath = versionRootPath(rootPath)
    const srcPath = getDownloadPath(version, rootPath)

    return new Promise((resolve, reject) => {
        targz.decompress(
            {
                src: srcPath,
                dest: destPath,
            },
            err => {
                if (err) {
                    log(err)
                    reject(err)
                } else {
                    log(`Finished extracting yarn version ${version}`)
                    fs.renameSync(
                        `${destPath}/yarn-v${version}`,
                        `${destPath}/v${version}`,
                    )
                    fs.unlinkSync(srcPath)
                    resolve()
                }
            },
        )
    })
}

const installVersion = async (version, rootPath = yvmPath) => {
    try {
        if (checkForVersion(version, rootPath)) {
            log(`It looks like you already have yarn ${version} installed...`)
            return
        }
        const versions = await getVersionsFromTags()
        if (versions.indexOf(version) === -1) {
            throw new Error('You have provided an invalid version number. use "yvm ls-remote" to see valid versions.')
        }
        await downloadVersion(version, rootPath)
        log(`Finished downloading yarn version ${version}`)
        return extractYarn(version, rootPath)
    } catch (error) {
        if (error) {
            log(error)
        }
        throw err
    }
}

module.exports = installVersion
