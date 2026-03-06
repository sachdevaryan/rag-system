import { useState, useEffect, useRef } from "react";
import axios from "axios";
import PdfViewer from "./PdfViewer";
import Typewriter from "./Typewriter";

export default function App() {

  const [file, setFile] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [sources, setSources] = useState([]);
  const [typing, setTyping] = useState(false);
  const [aboutOpen,setAboutOpen] = useState(false)

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [selectedPdf, setSelectedPdf] = useState(null);
  const [selectedPage, setSelectedPage] = useState(null);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);



  // Upload PDF
  const uploadFile = async () => {

    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setUploading(true);

    await axios.post(
      "http://127.0.0.1:8000/upload",
      formData,
      {
        onUploadProgress: (p) => {

          const percent = Math.round(
            (p.loaded * 100) / p.total
          );

          setProgress(percent);

        }
      }
    );

    setUploading(false);
  };



  // Ask Question
  const askQuestion = async () => {

    if (!question) return;

    const userMessage = {
      role: "user",
      content: question
    };

    setMessages(prev => [...prev, userMessage]);

    setQuestion("");

    setTyping(true);

    try {

      const res = await axios.post(
        "http://127.0.0.1:8000/search",
        {
          question: userMessage.content
        }
      );

      const assistantMessage = {
        role: "assistant",
        content: res.data.answer
      };

      setMessages(prev => [...prev, assistantMessage]);

      setSources(res.data.sources);

    } catch (error) {

      console.error(error);

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "Something went wrong."
        }
      ]);

    }

    setTyping(false);
  };



  return (

    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center p-8">

      {/* Title */}

      <div className="flex justify-between w-full max-w-3xl mb-8">

      <h1 className="text-4xl font-bold">
      RAG Document Assistant
      </h1>

      <button
      onClick={()=>setAboutOpen(true)}
      className="bg-zinc-800 px-4 py-2 rounded hover:bg-zinc-700"
      >
      About
      </button>

      </div>

      



      {/* Upload Section */}

      <div className="bg-zinc-900 p-6 rounded-xl shadow-lg w-full max-w-3xl mb-6">

      <h2 className="text-lg font-semibold mb-4">
      Upload PDF
      </h2>

      <div className="flex items-center gap-4">

      <label className="bg-zinc-800 px-4 py-2 rounded cursor-pointer hover:bg-zinc-700">
      Choose File
      <input
      type="file"
      className="hidden"
      onChange={(e)=>setFile(e.target.files[0])}
      />
      </label>

      <span className="text-gray-400 text-sm">
      {file?.name}
      </span>

      <button
      onClick={uploadFile}
      className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded"
      >
      Upload
      </button>

      </div>

      {uploading && (

      <div className="mt-4 w-full bg-zinc-800 rounded">

      <div
      className="bg-emerald-500 h-2 rounded"
      style={{width: `${progress}%`}}
      />

      </div>

      )}

      </div>



      {/* Chat Window */}

      <div className="bg-slate-800 w-full max-w-3xl rounded-xl shadow-lg p-6 h-[420px] overflow-y-auto">

        {messages.map((msg, index) => (

          <div
            key={index}
            className={`mb-4 flex ${
              msg.role === "user"
                ? "justify-end"
                : "justify-start"
            }`}
          >

            <div
              className={`px-4 py-3 rounded-xl max-w-[70%] ${
                msg.role === "user"
                  ? "bg-blue-600"
                  : "bg-slate-700"
              }`}
            >

              {msg.role === "assistant"
                ? <Typewriter text={msg.content} />
                : msg.content}

            </div>

          </div>

        ))}

        {typing && (
          <div className="text-gray-400 animate-pulse">
            AI is thinking...
          </div>
        )}

        <div ref={chatEndRef}></div>

      </div>



      {/* Input Section */}

      <div className="flex gap-4 w-full max-w-3xl mt-4">

        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask something about the document..."
          className="flex-1 bg-slate-800 border border-slate-700 rounded px-4 py-3"
        />

        <button
          onClick={askQuestion}
          className="bg-green-600 hover:bg-green-700 px-5 py-3 rounded"
        >
          Ask
        </button>

      </div>



      {/* Sources */}

      {sources.length > 0 && (

        <div className="bg-slate-800 w-full max-w-3xl rounded-xl shadow-lg p-6 mt-6">

          <h2 className="text-lg font-semibold mb-4">
            Sources
          </h2>

          {sources.slice(0, 3).map((source, i) => (

            <div
              key={i}
              className="border border-slate-700 rounded-lg p-4 mb-3 hover:bg-slate-700 transition cursor-pointer"
              onClick={() => {

                setSelectedPdf(
                  "http://127.0.0.1:8000/documents/" + source.document
                );

                setSelectedPage(source.page);

              }}
            >

              <p className="text-sm text-blue-400 mb-2">
                [{i + 1}] Page {source.page} — {source.document}
              </p>

              <p className="text-sm text-gray-300">
                {source.text}
              </p>

            </div>

          ))}

        </div>

      )}



      {/* PDF Viewer */}

      {selectedPdf && (

        <div className="w-full max-w-3xl">

          <PdfViewer
            file={selectedPdf}
            page={selectedPage}
          />

        </div>

      )}

      {aboutOpen && (

        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">

        <div className="bg-zinc-900 p-8 rounded-xl w-[500px]">

        <h2 className="text-xl font-bold mb-4">
        About This App
        </h2>

        <p className="text-gray-400 mb-4">

        This is a Retrieval-Augmented Generation (RAG) system that lets you
        upload PDFs and ask questions about them.

        The system uses:

        • Hybrid Retrieval (BM25 + Vector Search)  
        • Reranking  
        • LLM Answer Generation  
        • Citation-based responses

        </p>

        <button
        onClick={()=>setAboutOpen(false)}
        className="bg-emerald-600 px-4 py-2 rounded"
        >
        Close
        </button>

        </div>

        </div>

        )}

    </div>


  );
}

