import { useMemo } from 'react';
import QRCode from 'qrcode';
import { ImdFixedColors } from './imd_tokens';

export interface ImdQrProps {
  readonly data: string;
  /// الضلع الخارجي بما فيه الهامش.
  readonly size?: number;
  readonly className?: string;
}

/// الهامش الهادئ: وحدتان من وحدات الرمز على الأقل، وهنا نسبةٌ من الضلع.
const QUIET_FRACTION = 0.06;

/// رمز QR يُمسح بكاميرا أي جهاز (ماسح التطبيق أو كاميرا الهاتف).
///
/// الخلفية بيضاء دائمًا وحولها هامشٌ هادئ (quiet zone) ولو كانت الواجهة داكنة:
/// الماسح يقرأ التباين، والـQR أبيض على أسود لا يُقرأ بأكثر الأجهزة، والهامشُ
/// من شرط المواصفة لا زينة.
export function ImdQr({
  data,
  size = 220,
  className = '',
}: ImdQrProps) {
  const pathData = useMemo(() => {
    if (data.length === 0 || size <= 0) return '';
    try {
      const qr = QRCode.create(data, { errorCorrectionLevel: 'M' });
      const count = qr.modules.size;
      if (count <= 0) return '';
      const pad = size * QUIET_FRACTION;
      const side = Math.max(0, size - pad * 2);
      const cell = side / count;
      if (cell <= 0) return '';

      const parts: string[] = [];
      for (let r = 0; r < count; r++) {
        for (let c = 0; c < count; c++) {
          if (qr.modules.get(r, c)) {
            const x = Number((pad + c * cell).toFixed(4));
            const y = Number((pad + r * cell).toFixed(4));
            const w = Number(cell.toFixed(4));
            parts.push(`M${x} ${y}h${w}v${w}h${-w}z`);
          }
        }
      }
      return parts.join('');
    } catch {
      // نصٌّ أطول من سعة QR — يبقى الإطار الأبيض فارغًا والنص معروضٌ بجواره.
      return '';
    }
  }, [data, size]);

  return (
    <svg
      role="img"
      aria-label="رمز QR"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={`block shrink-0 ${className}`.trim()}
      shapeRendering="crispEdges"
    >
      <rect
        x={0}
        y={0}
        width={size}
        height={size}
        fill={ImdFixedColors.paper.css}
      />
      {pathData.length > 0 && (
        <path d={pathData} fill={ImdFixedColors.ink.css} />
      )}
    </svg>
  );
}
