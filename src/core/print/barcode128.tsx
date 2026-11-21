// MISSING: lib/core/print/barcode128.dart (المرحلة 18/19)
// بديل صوري أدنى لعرض Code128 دون اختراع رسم الباركود.

export interface Barcode128ViewProps {
  readonly value: string;
}

export function Barcode128View({ value }: Barcode128ViewProps) {
  return (
    <span
      data-imd-missing="lib/core/print/barcode128.dart"
      className="font-mono text-xs tracking-wider"
    >
      {value}
    </span>
  );
}
