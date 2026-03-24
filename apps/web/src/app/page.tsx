import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-4 pt-24 pb-16 text-center">
        <span className="inline-block bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          IA para pequenos negócios brasileiros
        </span>
        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight mb-5">
          Envie uma foto.<br />
          <span className="text-blue-600">Receba o post pronto.</span>
        </h1>
        <p className="text-lg text-gray-500 mb-8 max-w-xl mx-auto">
          Legenda + hashtags para o Instagram em 15 segundos.
          Sem saber escrever, sem agência, sem complicação.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">
            Testar grátis — 5 créditos
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Como funciona */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">
          Como funciona
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', title: 'Envie a foto',     desc: 'Foto do produto, do serviço ou do dia a dia do negócio.' },
            { step: '2', title: 'Escolha o tom',    desc: 'Descontraído, profissional, divertido ou elegante.' },
            { step: '3', title: 'Copie e publique', desc: 'Legenda e 15 hashtags prontas. Só colar no Instagram.' },
          ].map(({ step, title, desc }) => (
            <div key={step} className="card text-center">
              <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-4">
                {step}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
              <p className="text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Planos */}
      <section className="max-w-4xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Planos</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          {[
            { plan: 'Gratuito',  price: 'R$ 0',      credits: '5 gerações',   cta: 'Começar',        highlight: false },
            { plan: 'Starter',   price: 'R$ 19/mês', credits: '30 gerações',  cta: 'Assinar',        highlight: false },
            { plan: 'Pro',       price: 'R$ 37/mês', credits: '100 gerações', cta: 'Assinar',        highlight: true  },
            { plan: 'Agência',   price: 'R$ 97/mês', credits: '400 gerações', cta: 'Assinar',        highlight: false },
          ].map(({ plan, price, credits, cta, highlight }) => (
            <div key={plan} className={`card flex flex-col ${highlight ? 'border-2 border-blue-500 relative' : ''}`}>
              {highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                  Mais popular
                </span>
              )}
              <p className="font-bold text-gray-900 text-lg">{plan}</p>
              <p className="text-2xl font-bold text-blue-600 my-2">{price}</p>
              <p className="text-sm text-gray-500 mb-4">{credits}</p>
              <Link href="/register" className={`mt-auto text-center text-sm font-medium py-2 rounded-lg transition ${highlight ? 'bg-blue-600 text-white hover:bg-blue-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-100">
        PostAI © {new Date().getFullYear()} — Feito para empreendedores brasileiros
      </footer>
    </main>
  )
}
