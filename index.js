// noinspection JSCheckFunctionSignatures,JSUnresolvedFunction

const AdmZip = import('adm-zip')
const path = import('path')
const fs = import('fs')

const gitRemoteOriginUrl = import('remote-origin-url')
const parseGithubUrl = import('parse-github-url')
const gitBranch = import('git-branch')
const gitLog = import('gitlog').default

const packPath = process.argv[2]

async function run() {
    if (path == null) console.log("Please provide a path.")
    else {
        const list = []
        const files = fs.readdirSync(packPath).filter(file => file.endsWith(".zip") || file.endsWith(".pack"))
        for (const pack of files) {
            const zip = new AdmZip(path.join(packPath, pack))
            const metaFile = zip.getEntry('pack.meta')
            const gitUrl = parseGithubUrl(gitRemoteOriginUrl.sync())
            gitUrl.branch = gitBranch.sync()
            const meta = {
                url: `https://github.com/${gitUrl.repo}/raw/${gitUrl.branch}/${packPath}/${pack}`,
                author: 'Rboard Script',
                tags: []
            }
            meta.themes = zip.getEntries().filter(entry => entry.name.endsWith(".zip")).map(entry => entry.name.replace(".zip", ""))
            meta.size = fs.statSync(path.join(packPath, pack)).size
            await new Promise((res) => {
                gitLog({
                    repo: process.cwd(),
                    file: path.join(packPath, pack),
                    fields: ["hash", "authorName", "authorDate"]
                }, (error, commits) => {
                    const commit = commits[0]
                    if (commit) {
                        meta.date = new Date(commit.authorDate).getTime()
                        meta.author = commit.authorName
                    }
                    res()
                })
            })
            if (metaFile != null) {
                const tmp = metaFile.getData().toString()
                tmp.split(new RegExp('(\r\n|\n)')).forEach(metaEntry => {
                    if (metaEntry.includes('=')) {
                        meta[metaEntry.split('=')[0]] = (metaEntry.includes(',') || metaEntry.startsWith("tags")) ? metaEntry.split('=')[1].split(',') : metaEntry.split('=')[1]
                    }
                })
            } else {
                meta.name = pack.replace('_', ' ').replace(new RegExp('\.(zip|pack)'), '')
            }
            list.push(meta)
            console.log(`${meta.name} by ${meta.author} added.`)
        }
        fs.writeFileSync('list.json', JSON.stringify(list, null, 2))
    }
}

run().then(() => console.log('Done.'))
