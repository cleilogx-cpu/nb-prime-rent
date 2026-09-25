import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

/**
 * Captura de assinatura em <canvas> (Fase 5 do Contrato Inteligente) --
 * eventos de ponteiro padrão, sem lib nova. `touch-action: none` na área de
 * desenho impede a página de rolar enquanto o dedo traça a assinatura no
 * celular. O canvas começa com fundo branco pintado de verdade (não só CSS)
 * porque o resultado vira um arquivo (`getBlob`) que pode passar pela
 * compressão de imagem de documentsService.js -- que reconverte pra JPEG e
 * não entende transparência, então um fundo transparente viraria preto.
 */
const SignaturePad = forwardRef(function SignaturePad(_props, ref) {
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const hasStrokeRef = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const paintBackground = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#0f172a'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  useEffect(() => {
    paintBackground()
  }, [])

  const getPoint = (event) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (event) => {
    event.preventDefault()
    const canvas = canvasRef.current
    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    const { x, y } = getPoint(event)
    canvas.getContext('2d').beginPath()
    canvas.getContext('2d').moveTo(x, y)
  }

  const handlePointerMove = (event) => {
    if (!drawingRef.current) {
      return
    }
    event.preventDefault()
    const canvas = canvasRef.current
    const { x, y } = getPoint(event)
    const ctx = canvas.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasStrokeRef.current) {
      hasStrokeRef.current = true
      setIsEmpty(false)
    }
  }

  const stopDrawing = () => {
    drawingRef.current = false
  }

  const handleClear = () => {
    paintBackground()
    hasStrokeRef.current = false
    setIsEmpty(true)
  }

  useImperativeHandle(ref, () => ({
    isEmpty: () => !hasStrokeRef.current,
    clear: handleClear,
    getBlob: () => new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png')),
    // Versão síncrona (data URL) pra desenhar direto no PDF via jsPDF
    // addImage -- getBlob() continua existindo à parte pra subir o arquivo
    // de evidência no dossiê. JPEG (não PNG) de propósito: o jsPDF tem bug
    // conhecido com o canal alfa de PNG vindo de canvas.toDataURL, que
    // deixava a assinatura embutida no PDF só que invisível -- fundo do
    // canvas já é branco opaco (paintBackground), então JPEG sem alfa
    // resolve sem perder nada visualmente.
    getDataUrl: () => canvasRef.current.toDataURL('image/jpeg', 0.92),
  }))

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
        <canvas
          ref={canvasRef}
          width={600}
          height={220}
          style={{ touchAction: 'none' }}
          className="h-48 w-full cursor-crosshair sm:h-56"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{isEmpty ? 'Assine no espaço acima com o dedo ou o mouse.' : 'Assinatura capturada.'}</p>
        <button
          type="button"
          onClick={handleClear}
          disabled={isEmpty}
          className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40"
        >
          <Eraser size={12} />
          Limpar
        </button>
      </div>
    </div>
  )
})

export default SignaturePad
