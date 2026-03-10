import React, { useState, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { toPng } from 'html-to-image';
import { Upload, Wand2, Download, Image as ImageIcon, RefreshCw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const TEMPLATES = [
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=800&q=80', // Dog
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800&q=80', // Cat
  'https://images.unsplash.com/photo-1531427186611-ecfd6d936c79?w=800&q=80', // Confused person
  'https://images.unsplash.com/photo-1541364983171-a8ba01e95cfc?w=800&q=80', // Funny dog
];

export default function App() {
  const [selectedImage, setSelectedImage] = useState<string>(TEMPLATES[0]);
  const [topText, setTopText] = useState('');
  const [bottomText, setBottomText] = useState('');
  const [suggestedCaptions, setSuggestedCaptions] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const memeRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result as string);
        setSuggestedCaptions([]);
        setTopText('');
        setBottomText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const generateMagicCaptions = async () => {
    if (!selectedImage) return;
    setIsGenerating(true);
    setSuggestedCaptions([]);

    try {
      let imagePart;
      
      if (selectedImage.startsWith('data:')) {
        const mimeType = selectedImage.split(';')[0].split(':')[1];
        const base64Data = selectedImage.split(',')[1];
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType,
          },
        };
      } else {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
          reader.readAsDataURL(blob);
        });
        imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: blob.type,
          },
        };
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            imagePart,
            { text: 'Analyze this image and generate 5 funny, relevant, and punchy meme captions. Return ONLY a JSON array of strings.' }
          ]
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.STRING,
            },
          },
        },
      });

      const captions = JSON.parse(response.text || '[]');
      setSuggestedCaptions(captions);
    } catch (error) {
      console.error('Error generating captions:', error);
      alert('Failed to generate captions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!memeRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(memeRef.current, { quality: 0.95, pixelRatio: 2 });
      const link = document.createElement('a');
      link.download = 'ai-meme.png';
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download meme:', err);
      alert('Failed to download meme.');
    } finally {
      setIsDownloading(false);
    }
  };

  const applyCaption = (caption: string) => {
    const words = caption.split(' ');
    if (words.length > 4) {
      const mid = Math.floor(words.length / 2);
      setTopText(words.slice(0, mid).join(' '));
      setBottomText(words.slice(mid).join(' '));
    } else {
      setTopText('');
      setBottomText(caption);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans selection:bg-indigo-500/30">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 p-2 rounded-xl">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">AI Meme Generator</h1>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center min-h-[500px] relative overflow-hidden group">
              
              {selectedImage ? (
                <div 
                  ref={memeRef}
                  className="relative inline-block max-w-full overflow-hidden rounded-lg shadow-2xl bg-black"
                >
                  <img 
                    src={selectedImage} 
                    alt="Meme template" 
                    className="max-h-[600px] w-auto object-contain block"
                    crossOrigin="anonymous"
                  />
                  
                  <div className="absolute top-4 left-0 right-0 px-4 text-center pointer-events-none flex justify-center">
                    <h2 
                      className="text-white font-black uppercase tracking-wide break-words max-w-[90%]"
                      style={{ 
                        fontFamily: 'Impact, sans-serif',
                        fontSize: 'clamp(24px, 5vw, 48px)',
                        WebkitTextStroke: '1.5px black',
                        textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
                      }}
                    >
                      {topText}
                    </h2>
                  </div>

                  <div className="absolute bottom-4 left-0 right-0 px-4 text-center pointer-events-none flex justify-center">
                    <h2 
                      className="text-white font-black uppercase tracking-wide break-words max-w-[90%]"
                      style={{ 
                        fontFamily: 'Impact, sans-serif',
                        fontSize: 'clamp(24px, 5vw, 48px)',
                        WebkitTextStroke: '1.5px black',
                        textShadow: '2px 2px 0 #000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000'
                      }}
                    >
                      {bottomText}
                    </h2>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 flex flex-col items-center gap-4">
                  <ImageIcon className="w-12 h-12 opacity-50" />
                  <p>Select a template or upload an image</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <button
                onClick={handleDownload}
                disabled={!selectedImage || isDownloading}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                Download Meme
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
            
            <section className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-zinc-400" />
                1. Choose Image
              </h3>
              
              <div className="grid grid-cols-4 gap-2">
                {TEMPLATES.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedImage(url);
                      setSuggestedCaptions([]);
                    }}
                    className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${selectedImage === url ? 'border-indigo-500 scale-95' : 'border-transparent hover:border-zinc-700'}`}
                  >
                    <img src={url} alt={`Template ${idx + 1}`} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  </button>
                ))}
              </div>

              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-zinc-700 rounded-xl text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors bg-zinc-900/50">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload your own</span>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wand2 className="w-5 h-5 text-indigo-400" />
                2. Magic Captions
              </h3>
              
              <button
                onClick={generateMagicCaptions}
                disabled={!selectedImage || isGenerating}
                className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] animate-shimmer opacity-0 group-hover:opacity-100 transition-opacity" />
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing Image...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-5 h-5" />
                    Generate Funny Captions
                  </>
                )}
              </button>

              <AnimatePresence>
                {suggestedCaptions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <p className="text-sm text-zinc-400 mb-3">Click a caption to apply it:</p>
                    {suggestedCaptions.map((caption, idx) => (
                      <motion.button
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => applyCaption(caption)}
                        className="w-full text-left p-3 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500 hover:bg-zinc-800/80 transition-all text-sm font-medium"
                      >
                        "{caption}"
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            <section className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-zinc-400" />
                3. Fine-tune
              </h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Top Text</label>
                  <input
                    type="text"
                    value={topText}
                    onChange={(e) => setTopText(e.target.value)}
                    placeholder="TOP TEXT"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">Bottom Text</label>
                  <input
                    type="text"
                    value={bottomText}
                    onChange={(e) => setBottomText(e.target.value)}
                    placeholder="BOTTOM TEXT"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </section>

          </div>
        </div>
      </main>
    </div>
  );
}
