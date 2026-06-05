const fs = require('fs')
const path = require('path')

function walk(dir) {
  const files = []
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item)
    const stat = fs.statSync(full)
    if (stat.isDirectory()) files.push(...walk(full))
    else if (full.endsWith('.jsx')) files.push(full)
  }
  return files
}

for (const file of walk(path.join(__dirname, 'src'))) {
  let code = fs.readFileSync(file, 'utf8')
  if (/import\s+React(?:\s*,|\s+from)/.test(code)) continue
  if (/import\s*\{([^}]+)\}\s*from\s*['\"]react['\"]/.test(code)) {
    code = code.replace(/import\s*\{([^}]+)\}\s*from\s*['\"]react['\"]/, "import React, {$1} from 'react'")
  } else {
    code = "import React from 'react'\n" + code
  }
  fs.writeFileSync(file, code)
  console.log('fixed', path.relative(__dirname, file))
}
