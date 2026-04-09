import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabase';

// Setup worker for Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Stroke {
  points: { x: number; y: number }[];
}

interface PdfPageProps {
  key?: string;
  pageNumber: number;
  scale: number;
  containerWidth: number;
  isHighlightMode: boolean;
  highlights: Stroke[];
  onStrokeAdded: (pageNumber: number, stroke: Stroke) => void;
  onVisible: (pageNumber: number) => void;
}

const PdfPage = React.memo(function PdfPage({ pageNumber, scale, containerWidth, isHighlightMode, highlights, onStrokeAdded, onVisible }: PdfPageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);
  const [renderTrigger, setRenderTrigger] = useState(0);
  const pageRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1.414); // Default to A4 aspect ratio

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            onVisible(pageNumber);
          }
        });
      },
      { threshold: 0.3 }
    );

    if (pageRef.current) {
      observer.observe(pageRef.current);
    }

    return () => {
      if (pageRef.current) {
        observer.unobserve(pageRef.current);
      }
    };
  }, [pageNumber, onVisible]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawStroke = (stroke: Stroke) => {
      if (stroke.points.length === 0) return;
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * canvas.width, stroke.points[0].y * canvas.height);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvas.width, stroke.points[i].y * canvas.height);
      }
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
      ctx.lineWidth = 20 * scale;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    };

    highlights.forEach(drawStroke);
    if (currentStroke) {
      drawStroke(currentStroke);
    }
  }, [highlights, currentStroke, scale, renderTrigger]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = (e as TouchEvent).touches[0].clientX;
      clientY = (e as TouchEvent).touches[0].clientY;
    } else {
      clientX = (e as MouseEvent).clientX;
      clientY = (e as MouseEvent).clientY;
    }

    return {
      x: (clientX - rect.left) / rect.width,
      y: (clientY - rect.top) / rect.height
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isHighlightMode) return;
    e.preventDefault();
    setIsDrawing(true);
    const coords = getCoordinates(e.nativeEvent);
    setCurrentStroke({ points: [coords] });
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !isHighlightMode || !currentStroke) return;
    e.preventDefault();
    const coords = getCoordinates(e.nativeEvent);
    setCurrentStroke(prev => {
      if (!prev) return null;
      return { points: [...prev.points, coords] };
    });
  };

  const stopDrawing = () => {
    if (!isDrawing || !currentStroke) return;
    setIsDrawing(false);
    onStrokeAdded(pageNumber, currentStroke);
    setCurrentStroke(null);
  };

  const pageWidth = containerWidth * scale;
  const pageHeight = pageWidth * aspectRatio;

  return (
    <div 
      id={`pdf-page-${pageNumber}`}
      className="relative shadow-xl bg-white mb-8 mx-auto flex-shrink-0 select-none" 
      ref={pageRef}
      onContextMenu={(e) => e.preventDefault()}
      style={{ 
        width: pageWidth, 
        height: pageHeight,
      }}
    >
      <Page 
        pageNumber={pageNumber} 
        width={pageWidth}
        renderTextLayer={true}
        renderAnnotationLayer={true}
        loading={
          <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400">
            <div className="w-6 h-6 border-2 border-pmmg-blue/20 border-t-pmmg-blue rounded-full animate-spin mr-2"></div>
            Carregando...
          </div>
        }
        onLoadSuccess={(page: any) => {
          if (page.originalWidth && page.originalHeight) {
            setAspectRatio(page.originalHeight / page.originalWidth);
          } else if (page.view) {
            const w = page.view[2] - page.view[0];
            const h = page.view[3] - page.view[1];
            if (w && h) setAspectRatio(h / w);
          }
        }}
        onRenderSuccess={() => {
          const canvas = canvasRef.current;
          const pageElement = pageRef.current?.querySelector('.react-pdf__Page__canvas');
          if (canvas && pageElement) {
            canvas.width = (pageElement as HTMLCanvasElement).width;
            canvas.height = (pageElement as HTMLCanvasElement).height;
            canvas.style.width = `${(pageElement as HTMLCanvasElement).clientWidth}px`;
            canvas.style.height = `${(pageElement as HTMLCanvasElement).clientHeight}px`;
            setRenderTrigger(prev => prev + 1);
          }
        }}
      />
      <canvas
        ref={canvasRef}
        className={`absolute top-0 left-0 w-full h-full ${isHighlightMode ? 'cursor-crosshair z-10 touch-none' : 'pointer-events-none z-10'}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        style={{ touchAction: isHighlightMode ? 'none' : 'auto' }}
      />
    </div>
  );
});

export default function PdfReader() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as { pdfUrl?: string; title?: string; materialId?: string } | null;

  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [isHighlightMode, setIsHighlightMode] = useState(false);
  
  const [highlights, setHighlights] = useState<Record<number, Stroke[]>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const [pdfLoadError, setPdfLoadError] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<number>(0);
  const [pdfBlob, setPdfBlob] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const fetchPdf = async () => {
      if (!state?.pdfUrl) return;
      
      try {
        setDownloadProgress(0);
        setPdfLoadError(null);
        
        let blob: Blob;

        try {
          // Check cache first
          const cacheName = 'pdf-cache-v1';
          const cache = await caches.open(cacheName);
          const cachedResponse = await cache.match(state.pdfUrl);

          if (cachedResponse) {
            console.log('Carregando PDF do cache local...');
            blob = await cachedResponse.blob();
          } else {
            // 1. Tenta baixar usando o cliente do Supabase se for uma URL do Supabase
            // Isso ignora completamente o limite de 4.5MB da Vercel e usa a autenticação do usuário
            if (state.pdfUrl.includes('/storage/v1/object/')) {
              const urlObj = new URL(state.pdfUrl);
              const pathParts = urlObj.pathname.split('/object/');
              
              if (pathParts.length === 2) {
                const typeAndPath = pathParts[1]; // ex: "public/pdfs/arquivo.pdf"
                const parts = typeAndPath.split('/');
                const bucket = parts[1]; // "pdfs"
                const filePath = decodeURIComponent(parts.slice(2).join('/'));
                
                console.log(`Baixando diretamente do Supabase: Bucket=${bucket}, Path=${filePath}`);
                const { data, error } = await supabase.storage.from(bucket).download(filePath);
                
                if (error) throw error;
                if (!data) throw new Error('Arquivo vazio retornado pelo Supabase');
                blob = data;
              } else {
                throw new Error('URL do Supabase mal formatada');
              }
            } else {
              // 2. Tenta fetch direto para outras URLs
              const response = await fetch(state.pdfUrl);
              if (!response.ok) throw new Error(`HTTP ${response.status}`);
              blob = await response.blob();
            }

            // Save to cache
            if (blob) {
              const responseToCache = new Response(blob);
              await cache.put(state.pdfUrl, responseToCache);
            }
          }
        } catch (err) {
          console.log('Download direto falhou, tentando via proxy da Vercel...', err);
          // 3. Fallback para o proxy (pode falhar em arquivos > 4.5MB na Vercel)
          const proxyUrl = `/api/proxy-pdf?url=${encodeURIComponent(state.pdfUrl)}`;
          const response = await fetch(proxyUrl);
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || `Erro ${response.status}: Falha ao baixar o arquivo.`);
          }
          blob = await response.blob();
          
          // Save to cache
          if (blob) {
            const cacheName = 'pdf-cache-v1';
            const cache = await caches.open(cacheName);
            const responseToCache = new Response(blob);
            await cache.put(state.pdfUrl, responseToCache);
          }
        }
        if (!active) return;

        const url = URL.createObjectURL(blob);
        setPdfBlob(url);
        setDownloadProgress(100);
      } catch (err: any) {
        if (!active) return;
        console.error('Error fetching PDF:', err);
        setPdfLoadError(err.message || 'Erro ao carregar o arquivo PDF.');
      }
    };

    fetchPdf();
    
    return () => {
      active = false;
      if (pdfBlob) {
        URL.revokeObjectURL(pdfBlob);
      }
    };
  }, [state?.pdfUrl]);

  useEffect(() => {
    if (!state?.pdfUrl) {
      navigate('/materiais');
      return;
    }
  }, [state?.pdfUrl, navigate]);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 32); // 16px padding on each side
      }
    };

    updateWidth();
    // Small delay to ensure layout is complete
    setTimeout(updateWidth, 100);
    
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  useEffect(() => {
    async function loadAnnotations() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        if (state?.materialId) {
          let loadedFromSupabase = false;
          try {
            const { data, error } = await supabase
              .from('pdf_annotations')
              .select('annotations')
              .eq('user_id', user.id)
              .eq('material_id', state.materialId)
              .maybeSingle();
            
            if (error) throw error;
            
            if (data && data.annotations) {
              setHighlights(data.annotations);
              loadedFromSupabase = true;
            }
          } catch (err) {
            console.error('Error loading from Supabase, trying localStorage', err);
          }

          if (!loadedFromSupabase) {
            const localData = localStorage.getItem(`pdf_annotations_${user.id}_${state.materialId}`);
            if (localData) {
              try {
                setHighlights(JSON.parse(localData));
              } catch (e) {
                console.error('Error parsing local annotations', e);
              }
            }
          }
        }
      }
    }
    loadAnnotations();
  }, [state?.materialId]);

  const saveAnnotations = async () => {
    if (!userId || !state?.materialId) return;
    setIsSaving(true);
    try {
      const { data: existing, error: selectError } = await supabase
        .from('pdf_annotations')
        .select('id')
        .eq('user_id', userId)
        .eq('material_id', state.materialId)
        .maybeSingle();

      if (selectError) throw selectError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('pdf_annotations')
          .update({ annotations: highlights, updated_at: new Date().toISOString() })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('pdf_annotations')
          .insert({
            user_id: userId,
            material_id: state.materialId,
            annotations: highlights
          });
        if (insertError) throw insertError;
      }
    } catch (error) {
      console.error('Error saving annotations to Supabase, falling back to localStorage:', error);
    } finally {
      localStorage.setItem(`pdf_annotations_${userId}_${state.materialId}`, JSON.stringify(highlights));
      setHasUnsavedChanges(false);
      setIsSaving(false);
    }
  };

  const clearAnnotations = async () => {
    if (!userId || !state?.materialId) return;
    setIsSaving(true);
    try {
      await supabase
        .from('pdf_annotations')
        .delete()
        .eq('user_id', userId)
        .eq('material_id', state.materialId);
    } catch (error) {
      console.error('Error clearing annotations from Supabase:', error);
    } finally {
      localStorage.removeItem(`pdf_annotations_${userId}_${state.materialId}`);
      setHighlights({});
      setHasUnsavedChanges(false);
      setShowClearConfirm(false);
      setIsSaving(false);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));

  const handleStrokeAdded = React.useCallback((pNum: number, stroke: Stroke) => {
    setHighlights(prev => ({
      ...prev,
      [pNum]: [...(prev[pNum] || []), stroke]
    }));
    setHasUnsavedChanges(true);
  }, []);

  if (!state?.pdfUrl) return null;

  return (
    <div className="min-h-screen flex flex-col font-display bg-background-dark">
      <header className="sticky top-0 z-50 bg-pmmg-blue/95 backdrop-blur-md border-b border-white/10 px-5 py-4">
        <div className="flex items-center justify-between max-w-[480px] mx-auto">
          <div className="flex items-center gap-3">
            <Link to="/materiais" className="text-white/80 hover:text-white transition-colors">
              <span className="material-symbols-outlined text-2xl">close</span>
            </Link>
            <div className="flex flex-col">
              <h1 className="text-white text-sm font-bold truncate max-w-[150px]">{state.title || 'Documento PDF'}</h1>
              <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Página {pageNumber} de {numPages || '-'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {state.materialId && Object.keys(highlights).length > 0 && (
              <button 
                onClick={() => setShowClearConfirm(true)}
                className="p-2 rounded-full transition-colors text-slate-400 hover:text-red-400 bg-white/5"
                title="Limpar marcações"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            )}
            {state.materialId && (
              <button 
                onClick={saveAnnotations}
                disabled={!hasUnsavedChanges || isSaving}
                className={`p-2 rounded-full transition-colors ${hasUnsavedChanges ? 'text-pmmg-gold hover:bg-white/10' : 'text-slate-500'} bg-white/5`}
                title="Salvar marcações"
              >
                <span className={`material-symbols-outlined text-xl ${isSaving ? 'animate-spin' : ''}`}>
                  {isSaving ? 'sync' : 'save'}
                </span>
              </button>
            )}
            <button 
              onClick={() => setIsHighlightMode(!isHighlightMode)}
              className={`p-2 rounded-full transition-colors ${isHighlightMode ? 'bg-pmmg-gold text-background-dark' : 'text-slate-400 hover:text-white bg-white/5'}`}
              title="Destacar texto"
            >
              <span className="material-symbols-outlined text-xl">edit</span>
            </button>
            <button onClick={zoomOut} className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
              <span className="material-symbols-outlined text-xl">zoom_out</span>
            </button>
            <button onClick={zoomIn} className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full">
              <span className="material-symbols-outlined text-xl">zoom_in</span>
            </button>
          </div>
        </div>
      </header>
      
      <main className={`flex-1 flex flex-col w-full max-w-[480px] mx-auto bg-slate-200 relative overflow-y-auto ${isHighlightMode ? 'overflow-x-hidden' : 'overflow-x-auto'} pb-24`} ref={containerRef}>
        <div className={`flex flex-col p-4 min-h-full ${scale > 1 ? 'items-start' : 'items-center'}`}>
          {pdfLoadError ? (
            <div className="flex flex-col items-center justify-center py-12 w-full text-center px-4 bg-white rounded-2xl shadow-sm my-8">
              <span className="material-symbols-outlined text-red-500 text-5xl mb-4">error</span>
              <h3 className="text-slate-800 font-bold text-lg mb-2">Ops! Não conseguimos abrir o PDF</h3>
              <p className="text-slate-500 text-sm mb-6 leading-relaxed max-w-xs mx-auto">
                {pdfLoadError}
              </p>
              <div className="flex flex-col gap-3 w-full max-w-[240px]">
                <button 
                  onClick={() => window.location.reload()} 
                  className="bg-pmmg-blue text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-pmmg-blue/20 active:scale-95 transition-transform"
                >
                  Tentar Novamente
                </button>
              </div>
            </div>
          ) : containerWidth > 0 && pdfBlob ? (
            <Document
              file={pdfBlob}
              options={{ disableRange: true }}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('Error loading PDF:', error);
                setPdfLoadError(error.message || 'Falha ao processar o documento PDF.');
              }}
              loading={
                <div className="flex flex-col items-center justify-center py-12 w-full">
                  <div className="w-10 h-10 border-4 border-pmmg-blue/20 border-t-pmmg-blue rounded-full animate-spin mb-4"></div>
                  <p className="text-slate-500 text-sm font-bold mb-2">Processando PDF...</p>
                </div>
              }
            >
              {numPages > 0 && (
                <PdfPage
                  key={`page_${pageNumber}`}
                  pageNumber={pageNumber}
                  scale={scale}
                  containerWidth={containerWidth}
                  isHighlightMode={isHighlightMode}
                  highlights={highlights[pageNumber] || []}
                  onStrokeAdded={handleStrokeAdded}
                  onVisible={() => {}}
                />
              )}
            </Document>
          ) : containerWidth > 0 && !pdfLoadError ? (
            <div className="flex flex-col items-center justify-center py-12 w-full">
              <div className="w-10 h-10 border-4 border-pmmg-blue/20 border-t-pmmg-blue rounded-full animate-spin mb-4"></div>
              <p className="text-slate-500 text-sm font-bold mb-2">Baixando PDF...</p>
              <div className="w-48 h-2 bg-slate-300 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-pmmg-blue transition-all duration-300" 
                  style={{ width: `${downloadProgress}%` }}
                ></div>
              </div>
              <p className="text-slate-400 text-xs mt-2">{downloadProgress}%</p>
            </div>
          ) : null}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 w-full bg-pmmg-blue/95 backdrop-blur-md border-t border-white/10 z-50 pb-safe">
        <div className="max-w-[480px] mx-auto flex justify-between items-center h-16 px-5">
          <button 
            onClick={() => {
              setPageNumber(Math.max(pageNumber - 1, 1));
              containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={pageNumber <= 1}
            className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          
          <div className="flex items-center gap-2">
            <span className="text-white text-sm font-bold">{pageNumber}</span>
            <span className="text-slate-400 text-sm">/ {numPages || '-'}</span>
          </div>

          <button 
            onClick={() => {
              setPageNumber(Math.min(pageNumber + 1, numPages));
              containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            disabled={pageNumber >= numPages}
            className="text-slate-400 hover:text-white transition-colors p-2 bg-white/5 rounded-full disabled:opacity-50"
          >
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Limpar marcações</h3>
            <p className="text-slate-600 mb-6">
              Tem certeza que deseja apagar todas as marcações deste documento? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
                disabled={isSaving}
              >
                Cancelar
              </button>
              <button
                onClick={clearAnnotations}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center gap-2"
                disabled={isSaving}
              >
                {isSaving ? (
                  <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">delete</span>
                )}
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
