/**
 * Mostra as "seções" do contrato (o mesmo conteúdo que vira PDF/Word) numa
 * folha branca, legível no celular: texto justificado, quebra de palavras
 * longas, assinatura em coluna única em tela pequena.
 */
export default function ContractMinutaView({ sections, maxHeightClass = 'max-h-[60vh]' }) {
  return (
    <div className={`${maxHeightClass} overflow-y-auto rounded-2xl border border-white/10 bg-white p-4 text-[13px] leading-6 text-slate-900 shadow-inner sm:p-8 sm:text-sm`}>
      <div className="mx-auto max-w-[720px] break-words">
        {(sections || []).map((section, index) => {
          switch (section.type) {
            case 'kicker':
              return <p key={index} className="text-center text-[11px] uppercase tracking-widest text-slate-500">{section.text}</p>
            case 'title':
              return (
                <h1 key={index} className="mt-1 whitespace-pre-line text-center text-lg font-bold sm:text-xl">
                  {section.text}
                </h1>
              )
            case 'subtitle':
              return <p key={index} className="mt-1 text-center italic text-slate-700">{section.text}</p>
            case 'date':
              return <p key={index} className="mt-1 mb-4 text-center text-xs text-slate-500">{section.text}</p>
            case 'heading':
              return <h2 key={index} className="mt-5 mb-2 text-base font-bold sm:text-lg">{section.text}</h2>
            case 'subheading':
              return <h3 key={index} className="mt-5 mb-1 text-sm font-bold sm:text-base">{section.text}</h3>
            case 'clausetitle':
              return <p key={index} className="mt-3 mb-1 font-bold">{section.text}</p>
            case 'paragraph':
              return (
                <p
                  key={index}
                  className="mb-2 text-justify"
                  style={section.indent ? { marginLeft: `${section.indent * 1.25}rem` } : undefined}
                >
                  {section.text}
                </p>
              )
            case 'list':
              return (
                <ul key={index} className="mb-2 list-disc space-y-1 pl-5 text-justify">
                  {section.items.map((item, itemIndex) => (
                    <li key={itemIndex}>{item}</li>
                  ))}
                </ul>
              )
            case 'closing':
              return <p key={index} className="mt-5 text-center">{section.text}</p>
            case 'signature':
              return (
                <div key={index} className="mt-10 grid gap-8 sm:grid-cols-2">
                  {[
                    { name: section.locador, cpf: section.locadorCpf, role: section.locadorRole || 'LOCADOR' },
                    { name: section.locatario, cpf: section.locatarioCpf, role: section.locatarioRole || 'LOCATÁRIO' },
                  ].map((party) => (
                    <div key={party.role} className="border-t border-slate-900 pt-2 text-xs sm:text-sm">
                      <p className="font-semibold">{party.name}</p>
                      <p>CPF: {party.cpf}</p>
                      <p>{party.role}</p>
                    </div>
                  ))}
                </div>
              )
            default:
              return null
          }
        })}
      </div>
    </div>
  )
}
