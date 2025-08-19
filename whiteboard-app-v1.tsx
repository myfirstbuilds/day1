import React, { useState, useRef, useEffect } from 'react';
import { Pencil, Eraser, Square, Circle, Minus, RotateCcw, Download, Palette, Type, Undo, Redo } from 'lucide-react';

const WhiteboardApp = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(3);
  const [fontSize, setFontSize] = useState(16);
  const [lastPoint, setLastPoint] = useState(null);
  
  // Text tool states
  const [isTyping, setIsTyping] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  // Undo functionality
  const [undoList, setUndoList] = useState([]);
  const [redoList, setRedoList] = useState([]);

  const colors = [
    '#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', 
    '#FF00FF', '#00FFFF', '#FFA500', '#800080', '#FFC0CB'
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      
      // Set canvas size
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      
      // Scale context for high DPI
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      
      // Set canvas properties
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      // Save initial blank state
      setTimeout(() => saveState(), 100);
    };
    
    resizeCanvas();
    
    const handleResize = () => resizeCanvas();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const saveState = (keepRedo = false) => {
    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL();
    
    if (!keepRedo) {
      setRedoList([]);
    }
    
    setUndoList(prev => {
      const newList = [...prev, dataURL];
      // Keep only last 20 states to prevent memory issues
      return newList.length > 20 ? newList.slice(-20) : newList;
    });
  };

  const restoreState = (dataURL) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.drawImage(img, 0, 0, rect.width, rect.height);
    };
    img.src = dataURL;
  };

  const undo = () => {
    if (undoList.length > 1) {
      setRedoList(prev => [...prev, undoList[undoList.length - 1]]);
      const previousState = undoList[undoList.length - 2];
      restoreState(previousState);
      setUndoList(prev => prev.slice(0, -1));
    }
  };

  const redo = () => {
    if (redoList.length > 0) {
      const nextState = redoList[redoList.length - 1];
      restoreState(nextState);
      setUndoList(prev => [...prev, nextState]);
      setRedoList(prev => prev.slice(0, -1));
    }
  };

  const getCanvasCoordinates = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const clientY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (pos) => {
    if (tool === 'text') return;
    
    // Save state before starting to draw
    saveState();
    
    setIsDrawing(true);
    setLastPoint(pos);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (tool === 'pen' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    }
  };

  const draw = (pos) => {
    if (!isDrawing || tool === 'text') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineWidth = brushSize;
    
    if (tool === 'pen') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (['line', 'rectangle', 'circle'].includes(tool)) {
      // Clear and redraw for shape tools
      ctx.clearRect(0, 0, rect.width, rect.height);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, rect.width, rect.height);
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = color;
      ctx.beginPath();
      
      if (tool === 'line') {
        ctx.moveTo(lastPoint.x, lastPoint.y);
        ctx.lineTo(pos.x, pos.y);
      } else if (tool === 'rectangle') {
        const width = pos.x - lastPoint.x;
        const height = pos.y - lastPoint.y;
        ctx.strokeRect(lastPoint.x, lastPoint.y, width, height);
      } else if (tool === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - lastPoint.x, 2) + Math.pow(pos.y - lastPoint.y, 2));
        ctx.arc(lastPoint.x, lastPoint.y, radius, 0, 2 * Math.PI);
      }
      
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      setLastPoint(null);
    }
  };

  // Text tool functions
  const handleTextClick = (e) => {
    if (tool !== 'text') return;
    
    const pos = getCanvasCoordinates(e);
    
    // If already typing, finish current text
    if (isTyping) {
      finishText();
    }
    
    // Start new text
    setTextPosition(pos);
    setIsTyping(true);
    setTextInput('');
  };

  const finishText = () => {
    if (textInput.trim() && isTyping) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = color;
      ctx.font = `${fontSize}px Arial`;
      ctx.textBaseline = 'top';
      ctx.fillText(textInput, textPosition.x, textPosition.y);
      
      // Save state after text is added
      saveState();
    }
    
    setIsTyping(false);
    setTextInput('');
  };

  const handleTextInputChange = (e) => {
    setTextInput(e.target.value);
  };

  const handleTextKeyDown = (e) => {
    if (e.key === 'Enter') {
      finishText();
    } else if (e.key === 'Escape') {
      setIsTyping(false);
      setTextInput('');
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Clear text input if active
    setIsTyping(false);
    setTextInput('');
    
    // Save state after clearing and reset undo/redo
    setUndoList([]);
    setRedoList([]);
    setTimeout(() => saveState(), 100);
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleCanvasInteraction = (e) => {
    if (tool === 'text') {
      handleTextClick(e);
    } else {
      const pos = getCanvasCoordinates(e);
      if (e.type.includes('down') || e.type.includes('start')) {
        startDrawing(pos);
      } else if (e.type.includes('move')) {
        draw(pos);
      } else if (e.type.includes('up') || e.type.includes('end')) {
        stopDrawing();
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white shadow-md p-4 flex flex-wrap items-center gap-4 border-b">
        {/* Drawing Tools */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTool('pen')}
            className={`p-2 rounded ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Pen"
          >
            <Pencil size={20} />
          </button>
          <button
            onClick={() => setTool('eraser')}
            className={`p-2 rounded ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Eraser"
          >
            <Eraser size={20} />
          </button>
          <button
            onClick={() => setTool('line')}
            className={`p-2 rounded ${tool === 'line' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Line"
          >
            <Minus size={20} />
          </button>
          <button
            onClick={() => setTool('rectangle')}
            className={`p-2 rounded ${tool === 'rectangle' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Rectangle"
          >
            <Square size={20} />
          </button>
          <button
            onClick={() => setTool('circle')}
            className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Circle"
          >
            <Circle size={20} />
          </button>
          <button
            onClick={() => setTool('text')}
            className={`p-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}
            title="Text"
          >
            <Type size={20} />
          </button>
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* Color Palette */}
        <div className="flex items-center gap-2">
          <Palette size={20} className="text-gray-600" />
          <div className="flex gap-1">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-6 h-6 rounded border-2 ${color === c ? 'border-gray-800' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
                title={`Color: ${c}`}
              />
            ))}
          </div>
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer"
            title="Custom Color"
          />
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* Size Control */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{tool === 'text' ? 'Font:' : 'Size:'}</span>
          {tool === 'text' ? (
            <>
              <input
                type="range"
                min="8"
                max="72"
                value={fontSize}
                onChange={(e) => setFontSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600 w-8">{fontSize}</span>
            </>
          ) : (
            <>
              <input
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20"
              />
              <span className="text-sm text-gray-600 w-8">{brushSize}</span>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-gray-300"></div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={undoList.length <= 1}
            className={`p-2 rounded ${
              undoList.length <= 1
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
            title="Undo"
          >
            <Undo size={20} />
          </button>
          <button
            onClick={redo}
            disabled={redoList.length === 0}
            className={`p-2 rounded ${
              redoList.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-green-500 text-white hover:bg-green-600'
            }`}
            title="Redo"
          >
            <Redo size={20} />
          </button>
          <button
            onClick={clearCanvas}
            className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
            title="Clear Canvas"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={downloadCanvas}
            className="p-2 bg-purple-500 text-white rounded hover:bg-purple-600"
            title="Download"
          >
            <Download size={20} />
          </button>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 p-4 relative">
        <canvas
          ref={canvasRef}
          className={`w-full h-full bg-white rounded-lg shadow-lg ${
            tool === 'text' ? 'cursor-text' : 'cursor-crosshair'
          }`}
          style={{ width: '100%', height: '100%' }}
          onMouseDown={handleCanvasInteraction}
          onMouseMove={handleCanvasInteraction}
          onMouseUp={handleCanvasInteraction}
          onMouseLeave={stopDrawing}
          onTouchStart={handleCanvasInteraction}
          onTouchMove={handleCanvasInteraction}
          onTouchEnd={handleCanvasInteraction}
        />
        
        {/* Text Input Overlay */}
        {isTyping && (
          <input
            type="text"
            value={textInput}
            onChange={handleTextInputChange}
            onKeyDown={handleTextKeyDown}
            onBlur={finishText}
            className="absolute bg-white border-2 border-blue-500 outline-none px-2 py-1 rounded shadow-lg z-10"
            style={{
              left: `${textPosition.x + 16}px`,
              top: `${textPosition.y + 16}px`,
              fontSize: `${fontSize}px`,
              color: color,
              fontFamily: 'Arial',
              minWidth: '120px',
            }}
            placeholder="Type text..."
            autoFocus
          />
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-white border-t p-2 text-sm text-gray-600 flex justify-between items-center">
        <div>
          Tool: {tool.charAt(0).toUpperCase() + tool.slice(1)} | Color: {color} | 
          {tool === 'text' ? ` Font Size: ${fontSize}px` : ` Size: ${brushSize}px`} | 
          Undo: {undoList.length} | Redo: {redoList.length}
        </div>
        <div>
          {tool === 'text' 
            ? 'Click to add text, press Enter to confirm, Esc to cancel' 
            : 'Click and drag to draw'
          }
        </div>
      </div>
    </div>
  );
};

export default WhiteboardApp;