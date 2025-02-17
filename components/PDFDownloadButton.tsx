"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import type { Reclamo } from "@/components/AdminReclamos"
import dynamic from "next/dynamic"

const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink), { ssr: false })

const ReclamoPDF = dynamic(() => import("@/utils/generatePDF").then((mod) => mod.ReclamoPDF), {
  ssr: false,
})

export function PDFDownloadButton({ reclamo }: { reclamo: Reclamo }) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient || !reclamo) {
    return <Button variant="outline">Cargar PDF...</Button>
  }

  return (
    <PDFDownloadLink document={<ReclamoPDF reclamo={reclamo} />} fileName={`reclamo-${reclamo.id}.pdf`}>
      {({ blob, url, loading, error }) =>
        loading ? (
          <Button variant="outline" disabled>
            Generando PDF...
          </Button>
        ) : (
          <Button variant="outline">Descargar PDF</Button>
        )
      }
    </PDFDownloadLink>
  )
}

