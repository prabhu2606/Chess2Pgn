import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import Stepper from '@/components/ui/Stepper'

const steps = [
  { label: 'Upload', number: 1 },
  { label: 'Moves', number: 2 },
  { label: 'Info', number: 3 },
  { label: 'Done', number: 4 },
]

export default function ConvertPage() {
  return (
    <>
      <Header />
      <main>
        <section className="py-12 min-h-[calc(100vh-80px)] flex items-center justify-center bg-white">
          <div className="container">
            <Stepper steps={steps} activeStep={0} />
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

