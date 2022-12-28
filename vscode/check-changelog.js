const fs = require("fs")
const path = require("path")

const { version } = JSON.parse(fs.readFileSync("package.json").toString())
if (!fs.readFileSync("CHANGELOG.md").toString().includes(`# v${version}`)) {
    console.error(`\u001b[31mWarning: The version header "# v${version}" doesn't exist in \u001b]8;;file://${path.resolve("./CHANGELOG.md")}\u001b\\CHANGELOG.md\u001b]8;;\u001b\\.\u001b[0m`)
}
