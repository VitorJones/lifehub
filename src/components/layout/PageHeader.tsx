interface PageHeaderProps {
  titulo: string;
  subtitulo?: string;
  acoes?: React.ReactNode;
}

export function PageHeader({ titulo, subtitulo, acoes }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-2xl font-heading font-semibold text-[#f5f5f5]">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-sm text-[#a1a1aa] mt-0.5">{subtitulo}</p>
        )}
      </div>
      {acoes && <div className="flex items-center gap-3">{acoes}</div>}
    </div>
  );
}
