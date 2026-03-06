import { Document, Page, pdfjs } from "react-pdf";
import { useState } from "react";

import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function PdfViewer({ file, page }) {

  const [numPages, setNumPages] = useState(null);

  return (
    <div className="w-full max-w-5xl mx-auto mt-8">

      <div className="bg-black rounded-xl shadow-lg p-6 flex flex-col items-center">

        <div className="overflow-auto max-h-[80vh] flex justify-center">

          <Document
            file={file}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          >

            <Page
              pageNumber={page || 1}
              scale={1.4}
            />

          </Document>

        </div>

        <p className="text-gray-400 mt-3 text-sm">
          Page {page || 1} / {numPages}
        </p>

      </div>

    </div>
  );
}