"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { MessageSquare, Link2, FileText, Plus, X, Upload, MapPin, ExternalLink } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { temasReclamos } from "@/utils/temasReclamos"
import { db } from "@/lib/firebase"
import { collection, addDoc } from "firebase/firestore"
import { useDropzone } from "react-dropzone"
import { motion, AnimatePresence } from "framer-motion"
import { toast } from "@/components/ui/use-toast"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

const TUTORIAL_LINK = "https://drive.google.com/file/d/1DCD69aNzXheFY_MA6oNxuuHexdJcVhSw/view"

const esquemaFormulario = z.object({
  nombre: z.string().min(2, {
    message: "El nombre debe tener al menos 2 caracteres.",
  }),
  dni: z.string().min(7, {
    message: "Ingrese un DNI válido.",
  }),
  email: z.string().email({
    message: "Por favor, ingrese una dirección de correo electrónico válida.",
  }),
  telefono: z.string().min(10, {
    message: "Por favor, ingrese un número de teléfono válido.",
  }),
  fechaIncidente: z.date({
    required_error: "Por favor seleccione una fecha.",
  }),
  sector: z.string({
    required_error: "Por favor seleccione un sector.",
  }),
  tema: z.string({
    required_error: "Por favor seleccione un tema.",
  }),
  subtema: z.string().optional(),
  descripcion: z.string().min(10, {
    message: "La descripción debe tener al menos 10 caracteres.",
  }),
  recibirNotificaciones: z.boolean(),
  archivos: z
    .array(z.instanceof(File))
    .min(1, "Debe adjuntar al menos 1 imagen.")
    .max(2, "No puede adjuntar más de 2 imágenes.")
    .refine((files) => files.every((file) => file.type.startsWith("image/")), "Todos los archivos deben ser imágenes."),
  ubicacion: z.object({
    texto: z.string().min(1, "Por favor, ingrese una ubicación."),
    coordenadas: z
      .object({
        latitud: z.number().optional(),
        longitud: z.number().optional(),
      })
      .optional(),
  }),
})

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "deemssikv"
const CLOUDINARY_API_KEY = "925322665111847"
const CLOUDINARY_API_SECRET = "YmeBc6v5ehZy1DlfgL_gQc2XOwc"

const FloatingButton = () => (
  <a
    href={TUTORIAL_LINK}
    target="_blank"
    rel="noopener noreferrer"
    className="fixed top-4 right-4 z-50 bg-custom-blue hover:bg-custom-blue-dark text-white font-bold py-2 px-4 rounded-full shadow-lg flex items-center transition-colors duration-200"
  >
    Ver tutorial
    <ExternalLink className="ml-2 h-4 w-4" />
  </a>
)

export function FormularioReclamos() {
  const [sector, setSector] = useState("")
  const [tema, setTema] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [isCapturingLocation, setIsCapturingLocation] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reclamoId, setReclamoId] = useState<string | null>(null)

  useEffect(() => {
    const style = document.createElement("style")
    style.textContent = `
      .bg-custom-blue { background-color: #259be3; }
      .bg-custom-blue-dark { background-color: #1c7ab3; }
      .hover\\:bg-custom-blue-dark:hover { background-color: #1c7ab3; }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const form = useForm<z.infer<typeof esquemaFormulario>>({
    resolver: zodResolver(esquemaFormulario),
    defaultValues: {
      nombre: "",
      dni: "",
      email: "",
      telefono: "",
      sector: "",
      tema: "",
      subtema: "",
      descripcion: "",
      recibirNotificaciones: false,
      archivos: [],
      ubicacion: {
        texto: "",
        coordenadas: {
          latitud: undefined,
          longitud: undefined,
        },
      },
    },
  })

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.slice(0, 2 - imagePreviews.length)
      const newPreviews = newFiles.map((file) => URL.createObjectURL(file))
      setImagePreviews((prev) => [...prev, ...newPreviews].slice(0, 2))

      const currentFiles = form.getValues("archivos")
      const updatedFiles = [...currentFiles, ...newFiles].slice(0, 2)
      form.setValue("archivos", updatedFiles)
    },
    [imagePreviews, form],
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    maxFiles: 2,
    multiple: true,
  })

  const removeImage = (index: number) => {
    const newPreviews = [...imagePreviews]
    newPreviews.splice(index, 1)
    setImagePreviews(newPreviews)

    const currentFiles = form.getValues("archivos")
    const newFiles = currentFiles.filter((_, i) => i !== index)
    form.setValue("archivos", newFiles)
  }

  const captureLocation = () => {
    setIsCapturingLocation(true)
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          form.setValue("ubicacion.coordenadas", { latitud: latitude, longitud: longitude })
          form.setValue("ubicacion.texto", `Lat: ${latitude.toFixed(6)}, Long: ${longitude.toFixed(6)}`)
          setIsCapturingLocation(false)
          toast({
            title: "Ubicación capturada",
            description: "Se ha guardado su ubicación actual.",
            duration: 3000,
          })
        },
        (error) => {
          console.error("Error detallado de geolocalización:", {
            code: error.code,
            message: error.message,
          })
          setIsCapturingLocation(false)
          let errorMessage = "Error desconocido al capturar la ubicación."
          switch (error.code) {
            case 1:
              errorMessage =
                "Permiso denegado para acceder a la ubicación. Por favor, ingrese la ubicación manualmente."
              break
            case 2:
              errorMessage =
                "La información de ubicación no está disponible. Por favor, ingrese la ubicación manualmente."
              break
            case 3:
              errorMessage =
                "Se agotó el tiempo para obtener la ubicación. Por favor, intente de nuevo o ingrese la ubicación manualmente."
              break
          }
          toast({
            title: "Error al capturar ubicación",
            description: errorMessage,
            variant: "destructive",
            duration: 5000,
          })
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
      )
    } else {
      setIsCapturingLocation(false)
      toast({
        title: "Geolocalización no soportada",
        description: "Su navegador no soporta la geolocalización. Por favor, ingrese la ubicación manualmente.",
        variant: "destructive",
        duration: 5000,
      })
    }
  }

  async function onSubmit(values: z.infer<typeof esquemaFormulario>) {
    setIsSubmitting(true)
    try {
      // Upload images to Cloudinary
      const imageUrls = await Promise.all(
        values.archivos.map(async (file: File) => {
          const timestamp = Math.round(new Date().getTime() / 1000).toString()
          const params = {
            timestamp,
            upload_preset: "ml_default", // Make sure this matches your Cloudinary upload preset
          }
          const signature = await generateSignature(params)

          const formData = new FormData()
          formData.append("file", file)
          formData.append("api_key", CLOUDINARY_API_KEY)
          formData.append("timestamp", timestamp)
          formData.append("signature", signature)
          formData.append("upload_preset", "ml_default") // Make sure this matches your Cloudinary upload preset

          try {
            console.log("Iniciando carga de imagen a Cloudinary...")
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
              method: "POST",
              body: formData,
            })

            if (!response.ok) {
              const errorText = await response.text()
              console.error("Error en la respuesta de Cloudinary:", errorText)
              throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`)
            }

            const data = await response.json()
            console.log("Respuesta de Cloudinary:", JSON.stringify(data, null, 2))

            if (!data.secure_url) {
              console.error("Respuesta de Cloudinary sin URL segura:", data)
              throw new Error("No se recibió una URL segura de Cloudinary")
            }

            console.log("Imagen cargada exitosamente:", data.secure_url)
            return data.secure_url
          } catch (error) {
            console.error("Error detallado al cargar la imagen a Cloudinary:", error)
            if (error instanceof Error) {
              throw new Error(`Error al cargar la imagen: ${error.message}`)
            } else {
              throw new Error(`Error desconocido al cargar la imagen: ${JSON.stringify(error)}`)
            }
          }
        }),
      )

      // Prepare data for Firestore
      const reclamoData: any = {
        nombre: values.nombre,
        dni: values.dni,
        email: values.email,
        telefono: values.telefono,
        fechaIncidente: values.fechaIncidente.toISOString(),
        sector: values.sector,
        tema: values.tema,
        subtema: values.subtema || null,
        descripcion: values.descripcion,
        recibirNotificaciones: values.recibirNotificaciones,
        archivos: imageUrls,
        ubicacion: {
          texto: values.ubicacion.texto,
        },
        fechaCreacion: new Date().toISOString(),
        estado: "Pendiente",
      }

      // Only include coordinates if they are defined
      if (values.ubicacion.coordenadas?.latitud !== undefined && values.ubicacion.coordenadas?.longitud !== undefined) {
        reclamoData.ubicacion.coordenadas = {
          latitud: values.ubicacion.coordenadas.latitud,
          longitud: values.ubicacion.coordenadas.longitud,
        }
      }

      // Log the data being sent to Firestore
      console.log("Datos a enviar a Firestore:", JSON.stringify(reclamoData, null, 2))

      // Add document to Firestore
      const docRef = await addDoc(collection(db, "reclamos"), reclamoData)
      console.log("Reclamo guardado con ID: ", docRef.id)

      // Set the reclamo ID and open the dialog
      setReclamoId(docRef.id)
      setIsDialogOpen(true)

      // Reset the form
      form.reset()
      setImagePreviews([])
    } catch (error) {
      console.error("Error detallado al enviar el formulario:", error)
      if (error instanceof Error) {
        toast({
          title: "Error al enviar el reclamo",
          description: `Hubo un error al enviar el formulario: ${error.message}`,
          variant: "destructive",
          duration: 5000,
        })
      } else {
        toast({
          title: "Error al enviar el reclamo",
          description: `Hubo un error desconocido al enviar el formulario: ${JSON.stringify(error)}`,
          variant: "destructive",
          duration: 5000,
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function generateSignature(params: Record<string, string>) {
    const apiSecret = CLOUDINARY_API_SECRET
    const paramString = Object.keys(params)
      .sort()
      .map((key) => `${key}=${params[key]}`)
      .join("&")
    const stringToSign = paramString + apiSecret
    return await sha1(stringToSign)
  }

  async function sha1(str: string) {
    const buffer = new TextEncoder().encode(str)
    const hashBuffer = await crypto.subtle.digest("SHA-1", buffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
    return hashHex
  }

  return (
    <>
      <FloatingButton />
      <Card className="w-full max-w-3xl mx-auto bg-white shadow-lg">
        <div className="bg-custom-blue text-white p-3 rounded-t-lg text-center text-sm font-medium">
          SOLICITUD DE RECLAMOS - MUNICIPALIDAD ELDORADO
        </div>
        <CardHeader className="pb-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Nuevo Reclamo</h2>
            <span className="text-gray-500 text-sm">
              {new Date().toLocaleDateString("es-AR", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
          </div>
          <p className="text-gray-500 text-sm">Complete el formulario con los detalles de su reclamo</p>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-red-500 font-semibold text-sm">* Todos los campos son obligatorios</div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo</FormLabel>
                      <FormControl>
                        <Input placeholder="Su nombre" {...field} className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dni"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI</FormLabel>
                      <FormControl>
                        <Input placeholder="Su DNI" {...field} className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Correo electrónico</FormLabel>
                      <FormControl>
                        <Input placeholder="Su correo electrónico" {...field} className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input placeholder="Su número de teléfono" {...field} className="bg-gray-50" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="fechaIncidente"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Fecha del incidente</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal bg-gray-50",
                              !field.value && "text-muted-foreground",
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP", { locale: es })
                            ) : (
                              <span>Seleccione una fecha</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          locale={es}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 gap-6">
                <FormField
                  control={form.control}
                  name="sector"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sector</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          setSector(value)
                          setTema("")
                          form.setValue("tema", "")
                          form.setValue("subtema", "")
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-gray-50">
                            <SelectValue placeholder="Seleccione un sector" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(temasReclamos).map((sector) => (
                            <SelectItem key={sector} value={sector}>
                              {sector.charAt(0).toUpperCase() + sector.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {sector && (
                <FormField
                  control={form.control}
                  name="tema"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tema</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value)
                          setTema(value)
                          form.setValue("subtema", "")
                        }}
                      >
                        <FormControl>
                          <SelectTrigger className="bg-gray-50">
                            <SelectValue placeholder="Seleccione un tema" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.keys(temasReclamos[sector as keyof typeof temasReclamos]).map((tema) => (
                            <SelectItem key={tema} value={tema}>
                              {tema.charAt(0).toUpperCase() + tema.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {tema &&
                temasReclamos[sector as keyof typeof temasReclamos][
                  tema as keyof (typeof temasReclamos)[keyof typeof temasReclamos]
                ].length > 0 && (
                  <FormField
                    control={form.control}
                    name="subtema"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtema</FormLabel>
                        <Select onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="bg-gray-50">
                              <SelectValue placeholder="Seleccione un subtema" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {temasReclamos[sector as keyof typeof temasReclamos][
                              tema as keyof (typeof temasReclamos)[keyof typeof temasReclamos]
                            ].map((subtema) => (
                              <SelectItem key={subtema} value={subtema}>
                                {subtema.charAt(0).toUpperCase() + subtema.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              <FormField
                control={form.control}
                name="descripcion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describa su reclamo" {...field} className="bg-gray-50 min-h-[100px]" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="ubicacion.texto"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ubicación</FormLabel>
                      <div className="flex items-center space-x-2">
                        <FormControl>
                          <Input placeholder="Describa la ubicación" {...field} className="bg-gray-50" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={captureLocation}
                          disabled={isCapturingLocation}
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                      </div>
                      <FormDescription>
                        Ingrese la ubicación manualmente o haga clic en el botón para capturar su ubicación actual (si
                        está disponible).
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="archivos"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Archivos adjuntos (1 imagen obligatoria, máximo 2)</FormLabel>
                    <FormDescription>Suba al menos 1 imagen relevante al reclamo (máximo 2)</FormDescription>
                    <div
                      {...getRootProps()}
                      className={cn(
                        "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                        isDragActive ? "border-primary bg-primary/10" : "border-gray-300 hover:border-primary",
                      )}
                    >
                      <input {...getInputProps()} />
                      <div className="flex flex-col items-center">
                        <Upload className="w-12 h-12 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-600">
                          Arrastre y suelte imágenes aquí, o haga clic para seleccionar
                        </p>
                      </div>
                    </div>
                    <AnimatePresence>
                      {imagePreviews.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="mt-4 grid grid-cols-2 gap-4"
                        >
                          {imagePreviews.map((preview, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              className="relative group"
                            >
                              <img
                                src={preview || "/placeholder.svg"}
                                alt={`Preview ${index + 1}`}
                                className="w-full h-32 object-cover rounded-lg"
                              />
                              <button
                                type="button"
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                aria-label="Eliminar imagen"
                              >
                                <X size={16} />
                              </button>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="recibirNotificaciones"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Recibir notificaciones</FormLabel>
                      <FormDescription>Deseo recibir actualizaciones sobre el estado de mi reclamo</FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span>0 Comentarios</span>
                  </div>
                  <div className="flex items-center">
                    <Link2 className="w-4 h-4 mr-2" />
                    <span>0 Enlaces</span>
                  </div>
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    <span>0 Archivos</span>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="bg-custom-blue hover:bg-custom-blue-dark text-white"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Enviar Reclamo
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reclamo Enviado Exitosamente</DialogTitle>
              <DialogDescription>Su reclamo ha sido recibido y procesado correctamente.</DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                Gracias por comunicarse con nosotros. Su reclamo ha sido registrado en nuestro sistema.
              </p>
              <p className="mt-2 font-semibold">
                Número de seguimiento: <span className="text-blue-600">{reclamoId}</span>
              </p>
              <p className="mt-4 text-sm text-gray-500">
                Por favor, guarde este número para futuras referencias. Lo utilizará para consultar el estado de su
                reclamo.
              </p>
            </div>
            <Button
              className="mt-4 w-full bg-custom-blue hover:bg-custom-blue-dark text-white"
              onClick={() => setIsDialogOpen(false)}
            >
              Entendido
            </Button>
          </DialogContent>
        </Dialog>
      </Card>
    </>
  )
}

