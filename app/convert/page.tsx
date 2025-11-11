'use client'

import { useRef } from 'react'
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleTakePhotoClick = () => {
    cameraInputRef.current?.click()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Handle file upload logic here
      console.log('File selected:', file.name)
    }
  }

  const handleCameraChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Handle camera capture logic here
      console.log('Photo captured:', file.name)
    }
  }

  return (
    <>
      <Header />
      <main>
        <section className="py-12 min-h-[calc(100vh-80px)] flex items-center justify-center bg-white">
          <div className="container">
            <Stepper steps={steps} activeStep={0} />
            
            <div className="max-w-[600px] mx-auto mt-12">
              {/* Title Section */}
              <div className="text-center mb-8">
                <h1 className="text-[clamp(2rem,4vw,2.5rem)] font-bold text-contrast mb-2">
                  Upload Your First Page
                </h1>
                <p className="text-lg text-contrast/60">
                  One page at a time.
                </p>
              </div>

              {/* Info Box */}
              <div className="bg-accent1 border border-primary rounded-xl p-6 mb-8">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  <p className="text-contrast text-sm">
                    Write like you want a friend to read it.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">i</span>
                  </div>
                  <p className="text-contrast text-sm">
                    Want better accuracy? Legible writing and sharp photo.{' '}
                    <span className="text-primary font-semibold cursor-pointer hover:underline">
                      (Good Example)
                    </span>
                  </p>
                </div>
              </div>

              {/* Upload Options */}
              <div className="space-y-4">
                {/* Upload Photo - Always visible */}
                <button
                  onClick={handleUploadClick}
                  className="w-full bg-white border-2 border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-accent1/30 transition-colors duration-300 cursor-pointer"
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-full h-full text-primary"
                    >
                      {/* Sun/Moon */}
                      <circle
                        cx="6"
                        cy="6"
                        r="3"
                        fill="currentColor"
                      />
                      {/* Mountains/Hills */}
                      <path
                        d="M2 20L8 12L14 16L22 8V20H2Z"
                        fill="currentColor"
                      />
                    </svg>
                  </div>
                  <span className="text-primary font-semibold text-lg">
                    Upload Photo
                  </span>
                </button>

                {/* Take Photo - Mobile only */}
                <button
                  onClick={handleTakePhotoClick}
                  className="w-full bg-white border-2 border-primary rounded-xl p-8 flex flex-col items-center justify-center gap-4 hover:bg-accent1/30 transition-colors duration-300 cursor-pointer md:hidden"
                >
                  <div className="w-16 h-16 flex items-center justify-center">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="w-full h-full text-primary"
                    >
                      <path
                        d="M23 19C23 19.5304 22.7893 20.0391 22.4142 20.4142C22.0391 20.7893 21.5304 21 21 21H3C2.46957 21 1.96086 20.7893 1.58579 20.4142C1.21071 20.0391 1 19.5304 1 19V8C1 7.46957 1.21071 6.96086 1.58579 6.58579C1.96086 6.21071 2.46957 6 3 6H7L9 4H15L17 6H21C21.5304 6 22.0391 6.21071 22.4142 6.58579C22.7893 6.96086 23 7.46957 23 8V19Z"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle
                        cx="12"
                        cy="13"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <span className="text-primary font-semibold text-lg">
                    Take Photo
                  </span>
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraChange}
                className="hidden"
              />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}

