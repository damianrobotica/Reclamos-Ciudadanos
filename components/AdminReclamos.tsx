"use client"

import { useState, useEffect, useCallback } from "react"
import { db } from "@/lib/firebase"
import { collection, getDocs, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { format, isWithinInterval, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import {
  MoreVertical,
  Plus,
  Clock,
  AlertCircle,
  PlayCircle,
  CheckCircle2,
  Pause,
  Calendar,
  MapPin,
  Phone,
  Mail,
  User,
  FileText,
  MessageSquare,
  HelpCircle,
  Search,
} from "lucide-react"
import { lightTheme } from "@/lib/themes"
import { temasReclamos } from "@/utils/temasReclamos"
import type React from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { addDays } from "date-fns"

type UserRole = "admin" | "viewer" | "sectionUser"

interface AdminUser {
  email: string
  password: string
  role: UserRole
  section?: string
}

const ADMIN_USERS: AdminUser[] = [
  { email: "admin@eldorado.gob.ar", password: "admin123", role: "admin" },
  { email: "viewer@eldorado.gob.ar", password: "viewer123", role: "viewer" },
  { email: "ambiente@eldorado.gob.ar", password: "ambiente123", role: "sectionUser", section: "Ambiente" },
  ...Object.keys(temasReclamos).map((section) => ({
    email: `${section.toLowerCase().replace(/\s+/g, "")}@eldorado.gob.ar`,
    password: `${section.toLowerCase().replace(/\s+/g, "")}123`,
    role: "sectionUser" as const,
    section,
  })),
]

type EstadoReclamo = "Recepcionado" | "En análisis" | "En proceso" | "Finalizado" | "Pausado" | "Pendiente"

export interface Reclamo {
  id: string
  nombre: string
  email: string
  sector: string
  tema: string
  subtema?: string
  descripcion: string
  fechaCreacion: string
  fechaIncidente: string
  estado: EstadoReclamo
  archivos: string[]
  telefono?: string
  ubicacion?: {
    texto: string
    coordenadas?: {
      latitud: number
      longitud: number
    }
  }
  notas: { texto: string; fecha: string }[]
}

function generateGoogleMapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function AdminReclamos() {
  const [reclamos, setReclamos] = useState<Reclamo[]>([])
  const [filteredReclamos, setFilteredReclamos] = useState<Reclamo[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [reclamoSeleccionado, setReclamoSeleccionado] = useState<Reclamo | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null)
  const [newNote, setNewNote] = useState("")
  const [selectedEstado, setSelectedEstado] = useState<EstadoReclamo | "todos">("todos")
  const [selectedSector, setSelectedSector] = useState<string | "todos">("todos")
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: addDays(new Date(), -30),
    to: new Date(),
  })
  const [isLoading, setIsLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("currentUser")
    if (storedUser) {
      const user = JSON.parse(storedUser)
      setIsAuthenticated(true)
      setCurrentUser(user)
      fetchReclamos(user)
    }
  }, [])

  const filterReclamos = useCallback(() => {
    let filtered = reclamos
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (reclamo) =>
          reclamo.id.toLowerCase().includes(searchLower) ||
          reclamo.nombre.toLowerCase().includes(searchLower) ||
          reclamo.email.toLowerCase().includes(searchLower) ||
          reclamo.sector.toLowerCase().includes(searchLower) ||
          reclamo.tema.toLowerCase().includes(searchLower) ||
          reclamo.estado.toLowerCase().includes(searchLower),
      )
    }
    if (selectedEstado !== "todos") {
      filtered = filtered.filter((reclamo) => reclamo.estado === selectedEstado)
    }
    if (selectedSector !== "todos") {
      filtered = filtered.filter((reclamo) => reclamo.sector === selectedSector)
    }
    if (dateRange.from && dateRange.to) {
      filtered = filtered.filter((reclamo) =>
        isWithinInterval(parseISO(reclamo.fechaCreacion), { start: dateRange.from, end: dateRange.to }),
      )
    }
    setFilteredReclamos(filtered)
  }, [reclamos, searchTerm, selectedEstado, selectedSector, dateRange])

  useEffect(() => {
    filterReclamos()
  }, [filterReclamos])

  async function fetchReclamos(user: AdminUser) {
    if (!user) {
      console.error("User not authenticated")
      return
    }

    setIsLoading(true)
    const reclamosRef = collection(db, "reclamos")

    try {
      const querySnapshot = await getDocs(reclamosRef)
      const reclamosData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Reclamo[]

      reclamosData.sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))

      const filteredReclamos =
        user.role === "sectionUser" && user.section
          ? reclamosData.filter((reclamo) => reclamo.sector === user.section)
          : reclamosData

      setReclamos(filteredReclamos)
    } catch (error) {
      console.error("Error fetching reclamos:", error)
      toast({
        title: "Error al cargar reclamos",
        description: "Hubo un problema al cargar los reclamos. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function authenticateAdmin(email: string, password: string): Promise<boolean> {
    try {
      const user = ADMIN_USERS.find((u) => u.email === email && u.password === password)
      if (user) {
        setIsAuthenticated(true)
        setCurrentUser(user)
        localStorage.setItem("currentUser", JSON.stringify(user))
        toast({
          title: "Autenticación exitosa",
          description: `Bienvenido al panel de administración, ${getUserRoleDescription(user)}`,
        })
        await fetchReclamos(user)
        return true
      } else {
        throw new Error("Credenciales inválidas")
      }
    } catch (error) {
      console.error("Error de autenticación:", error)
      setIsAuthenticated(false)
      setCurrentUser(null)
      localStorage.removeItem("currentUser")
      toast({
        title: "Error de autenticación",
        description: "Credenciales inválidas. Por favor, intente nuevamente.",
        variant: "destructive",
      })
      return false
    }
  }

  function getUserRoleDescription(user: AdminUser): string {
    switch (user.role) {
      case "admin":
        return "Administrador"
      case "viewer":
        return "Visualizador"
      case "sectionUser":
        return `Usuario de sección ${user.section}`
      default:
        return "Usuario"
    }
  }

  async function actualizarEstadoReclamo(id: string, nuevoEstado: EstadoReclamo) {
    const reclamoRef = doc(db, "reclamos", id)
    await updateDoc(reclamoRef, { estado: nuevoEstado })
    await fetchReclamos(currentUser!)
    toast({
      title: "Estado actualizado",
      description: `El reclamo ha sido marcado como ${nuevoEstado}`,
    })
  }

  async function eliminarReclamo(id: string) {
    if (currentUser?.role !== "admin") {
      toast({
        title: "Acción no permitida",
        description: "No tienes permisos para eliminar reclamos.",
        variant: "destructive",
      })
      return
    }

    if (window.confirm("¿Está seguro de que desea eliminar este reclamo?")) {
      const reclamoRef = doc(db, "reclamos", id)
      await deleteDoc(reclamoRef)
      await fetchReclamos(currentUser)
      toast({
        title: "Reclamo eliminado",
        description: "El reclamo ha sido eliminado exitosamente",
      })
    }
  }

  async function agregarNota(id: string, nota: string) {
    if (!nota.trim()) return
    const reclamoRef = doc(db, "reclamos", id)
    const nuevaNota = { texto: nota, fecha: new Date().toISOString() }
    await updateDoc(reclamoRef, {
      notas: [...(reclamoSeleccionado?.notas || []), nuevaNota],
    })
    setNewNote("")
    await fetchReclamos(currentUser!)
    toast({
      title: "Nota agregada",
      description: "La nota ha sido agregada exitosamente al reclamo",
    })
    if (reclamoSeleccionado) {
      setReclamoSeleccionado({
        ...reclamoSeleccionado,
        notas: [...(reclamoSeleccionado.notas || []), nuevaNota],
      })
    }
  }

  function EstadoBadge({ estado }: { estado: EstadoReclamo }) {
    const badges: Record<EstadoReclamo, { variant: string; icon: React.ReactNode }> = {
      Recepcionado: { variant: "info", icon: <Clock className="w-4 h-4" /> },
      "En análisis": { variant: "warning", icon: <AlertCircle className="w-4 h-4" /> },
      "En proceso": { variant: "inProgress", icon: <PlayCircle className="w-4 h-4" /> },
      Finalizado: { variant: "success", icon: <CheckCircle2 className="w-4 h-4" /> },
      Pausado: { variant: "secondary", icon: <Pause className="w-4 h-4" /> },
      Pendiente: { variant: "warning", icon: <Clock className="w-4 h-4" /> },
    }

    const defaultBadge = { variant: "secondary", icon: <HelpCircle className="w-4 h-4" /> }
    const { variant, icon } = badges[estado] || defaultBadge

    return (
      <Badge variant={variant as any} className="flex items-center gap-1 px-3 py-1">
        {icon}
        <span>{estado}</span>
      </Badge>
    )
  }

  const uniqueSectors = Array.from(new Set(reclamos.map((reclamo) => reclamo.sector)))

  function handleLogout() {
    setIsAuthenticated(false)
    setCurrentUser(null)
    localStorage.removeItem("currentUser")
    setReclamos([])
    setFilteredReclamos([])
    window.location.href = "/admin"
  }

  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen ${lightTheme.background} flex items-center justify-center p-4`}>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Iniciar sesión</CardTitle>
            <p className={`${lightTheme.text.secondary} text-sm`}>Ingrese sus credenciales de administrador</p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                const email = formData.get("email") as string
                const password = formData.get("password") as string
                await authenticateAdmin(email, password)
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Input id="email" name="email" type="email" placeholder="Correo electrónico" required />
              </div>
              <div className="space-y-2">
                <Input id="password" name="password" type="password" placeholder="Contraseña" required />
              </div>
              <Button type="submit" className="w-full">
                Iniciar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={`min-h-screen ${lightTheme.background}`}>
      <div className="container mx-auto py-8 px-4">
        <div className="absolute top-4 right-4">
          <Button variant="outline" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </div>
        <div className="flex flex-col space-y-8">
          {/* Header */}
          <div className="bg-sky-400 text-white p-4 rounded-t-xl">
            <h1 className="text-2xl font-bold">Panel de Administración</h1>
            <p className="text-sky-100">
              {currentUser?.role === "sectionUser"
                ? `Gestione los reclamos de la sección ${currentUser.section}`
                : "Gestione los reclamos de manera eficiente"}
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                title: "Total Reclamos",
                value: reclamos.length,
                icon: <FileText className="w-5 h-5 text-sky-500" />,
              },
              {
                title: "En Proceso",
                value: reclamos.filter((r) => r.estado === "En proceso").length,
                icon: <PlayCircle className="w-5 h-5 text-mint-500" />,
              },
              {
                title: "Finalizados",
                value: reclamos.filter((r) => r.estado === "Finalizado").length,
                icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
              },
              {
                title: "Pausados",
                value: reclamos.filter((r) => r.estado === "Pausado").length,
                icon: <Pause className="w-5 h-5 text-gray-500" />,
              },
            ].map((stat) => (
              <Card key={stat.title} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    {stat.icon}
                    <CardTitle className="text-sm font-medium text-gray-500">{stat.title}</CardTitle>
                  </div>
                  <p className="text-2xl font-bold mt-2">{stat.value}</p>
                </CardHeader>
              </Card>
            ))}
          </div>

          {/* Table */}
          <Card className="overflow-hidden">
            <div className="bg-sky-400 text-white px-6 py-4">
              <CardTitle className="text-white">Reclamos</CardTitle>
            </div>
            <CardContent>
              {/* Search and Filters */}
              <div className="mb-4 space-y-4">
                <div className="flex flex-wrap gap-4">
                  <Input
                    type="text"
                    placeholder="Buscar reclamos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="max-w-sm"
                    icon={<Search className="w-4 h-4 text-gray-400" />}
                  />
                  <Select
                    value={selectedEstado}
                    onValueChange={(value) => setSelectedEstado(value as EstadoReclamo | "todos")}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="Recepcionado">Recepcionado</SelectItem>
                      <SelectItem value="En análisis">En análisis</SelectItem>
                      <SelectItem value="En proceso">En proceso</SelectItem>
                      <SelectItem value="Finalizado">Finalizado</SelectItem>
                      <SelectItem value="Pausado">Pausado</SelectItem>
                      <SelectItem value="Pendiente">Pendiente</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={selectedSector} onValueChange={setSelectedSector}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filtrar por sector" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los sectores</SelectItem>
                      {uniqueSectors.map((sector) => (
                        <SelectItem key={sector} value={sector}>
                          {sector}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              </div>
              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <p>Cargando reclamos...</p>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Sector</TableHead>
                        <TableHead>Tema</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Archivos</TableHead>
                        <TableHead>Notas</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredReclamos.map((reclamo) => (
                        <TableRow key={reclamo.id}>
                          <TableCell className="font-medium">{reclamo.id.slice(0, 8)}</TableCell>
                          <TableCell>{format(new Date(reclamo.fechaCreacion), "dd/MM/yyyy", { locale: es })}</TableCell>
                          <TableCell>{reclamo.nombre}</TableCell>
                          <TableCell>{reclamo.sector}</TableCell>
                          <TableCell>{reclamo.tema}</TableCell>
                          <TableCell>
                            <EstadoBadge estado={reclamo.estado} />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span>{reclamo.archivos.length}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="w-4 h-4 text-gray-400" />
                              <span>{reclamo.notas?.length || 0}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <span className="sr-only">Abrir menú</span>
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setReclamoSeleccionado(reclamo)
                                    setIsModalOpen(true)
                                  }}
                                >
                                  Ver detalles
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "Recepcionado")}>
                                  Marcar como Recepcionado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "En análisis")}>
                                  Marcar como En análisis
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "En proceso")}>
                                  Marcar como En proceso
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "Finalizado")}>
                                  Marcar como Finalizado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "Pausado")}>
                                  Marcar como Pausado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => actualizarEstadoReclamo(reclamo.id, "Pendiente")}>
                                  Marcar como Pendiente
                                </DropdownMenuItem>
                                {currentUser?.role === "admin" && (
                                  <DropdownMenuItem onClick={() => eliminarReclamo(reclamo.id)}>
                                    Eliminar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Reclamo Detail Modal */}
      <Dialog
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open)
          if (!open) setReclamoSeleccionado(null)
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] p-0">
          {reclamoSeleccionado && (
            <>
              <DialogHeader className="bg-sky-400 text-white p-6">
                <DialogTitle className="flex items-center justify-between">
                  <span>Reclamo #{reclamoSeleccionado.id.slice(0, 8)}</span>
                  <EstadoBadge estado={reclamoSeleccionado.estado} />
                </DialogTitle>
              </DialogHeader>
              <ScrollArea className="h-[calc(90vh-8rem)] pr-4">
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Personal Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Información Personal</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span>{reclamoSeleccionado.nombre}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span>{reclamoSeleccionado.email}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span>{reclamoSeleccionado.telefono || "No proporcionado"}</span>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Complaint Details */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Detalles del Reclamo</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>
                            {reclamoSeleccionado.sector} - {reclamoSeleccionado.tema}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>{format(new Date(reclamoSeleccionado.fechaIncidente), "PPP", { locale: es })}</span>
                        </div>
                        {reclamoSeleccionado.ubicacion && (
                          <div className="flex items-center space-x-2">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {reclamoSeleccionado.ubicacion.coordenadas ? (
                              <a
                                href={generateGoogleMapsLink(
                                  reclamoSeleccionado.ubicacion.coordenadas.latitud,
                                  reclamoSeleccionado.ubicacion.coordenadas.longitud,
                                )}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:underline"
                              >
                                Ver en Google Maps
                              </a>
                            ) : (
                              <span>{reclamoSeleccionado.ubicacion.texto}</span>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Description */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Descripción</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{reclamoSeleccionado.descripcion}</p>
                    </CardContent>
                  </Card>

                  {/* Images */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Imágenes</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4">
                        {reclamoSeleccionado.archivos.map((url, index) => (
                          <div key={index} className="relative group aspect-video">
                            <img
                              src={url || "/placeholder.svg"}
                              alt={`Imagen ${index + 1}`}
                              className="w-full h-full object-cover rounded-lg"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all rounded-lg flex items-center justify-center">
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                Ver imagen
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Notes */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Notas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        {reclamoSeleccionado.notas?.map((nota, index) => (
                          <div key={index} className="p-4 rounded-lg bg-gray-50 border border-gray-100">
                            <p className="text-sm text-gray-500 mb-2">
                              {format(new Date(nota.fecha), "PPP p", { locale: es })}
                            </p>
                            <p className="text-gray-700">{nota.texto}</p>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Agregar una nueva nota..."
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                        />
                        <Button onClick={() => agregarNota(reclamoSeleccionado.id, newNote)} disabled={!newNote.trim()}>
                          <Plus className="w-4 h-4 mr-2" />
                          Agregar Nota
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Acciones</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex space-x-2">
                        {["Recepcionado", "En análisis", "En proceso", "Finalizado", "Pausado", "Pendiente"].map(
                          (estado) => (
                            <Button
                              key={estado}
                              variant={reclamoSeleccionado.estado === estado ? "default" : "outline"}
                              onClick={() => actualizarEstadoReclamo(reclamoSeleccionado.id, estado as EstadoReclamo)}
                            >
                              {estado}
                            </Button>
                          ),
                        )}
                        {currentUser?.role === "admin" && (
                          <Button variant="destructive" onClick={() => eliminarReclamo(reclamoSeleccionado.id)}>
                            Eliminar
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

