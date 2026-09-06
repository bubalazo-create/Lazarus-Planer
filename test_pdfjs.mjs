import * as pdfjsLib from 'pdfjs-dist';
import * as fs from 'fs';

const files = [
    "D:/Documents/Profit & loss/Invoice's/Invoice's 2026/Q1/154-Demo-Client-A.pdf",
    "D:/Documents/Profit & loss/Invoice's/Invoice's 2026/canceled.pdf",
    "D:/Documents/Profit & loss/Invoice's/Invoice's 2024/130-Demo-Client-B.pdf",
    "D:/Documents/Profit & loss/Invoice's/Invoice's 2023/107-Demo-Client-C.pdf"
];

async function extractText(file) {
    const data = new Uint8Array(fs.readFileSync(file));
    const loadingTask = pdfjsLib.getDocument({ data });
    const pdfDocument = await loadingTask.promise;
    
    let fullText = '';
    for (let pageNum = 1; pageNum <= pdfDocument.numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items.map((item) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5]
        }));
        
        items.sort((a, b) => {
            if (Math.abs(a.y - b.y) > 5) {
                return b.y - a.y;
            }
            return a.x - b.x;
        });
        
        fullText += items.map(i => i.str).join(' ') + '\n';
    }
    return fullText;
}

async function test() {
    for (const file of files) {
        const text = await extractText(file);
        console.log(`\n\n=== TEXT FOR ${file} ===\n${text}`);
    }
}
test();
