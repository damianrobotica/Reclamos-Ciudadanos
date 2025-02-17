import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"
import type { Reclamo } from "@/components/AdminReclamos"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
  },
  section: {
    margin: 10,
    padding: 10,
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 10,
  },
  text: {
    fontSize: 12,
    marginBottom: 5,
  },
})

export const ReclamoPDF = ({ reclamo }: { reclamo: Reclamo }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.section}>
        <Text style={styles.title}>Detalle del Reclamo</Text>
        <Text style={styles.subtitle}>ID: {reclamo.id}</Text>
        <Text style={styles.text}>Estado: {reclamo.estado}</Text>
        <Text style={styles.text}>
          Fecha de creación: {format(new Date(reclamo.fechaCreacion), "PPP", { locale: es })}
        </Text>
        <Text style={styles.text}>Nombre: {reclamo.nombre}</Text>
        <Text style={styles.text}>Email: {reclamo.email}</Text>
        <Text style={styles.text}>Teléfono: {reclamo.telefono || "No proporcionado"}</Text>
        <Text style={styles.text}>Sector: {reclamo.sector}</Text>
        <Text style={styles.text}>Tema: {reclamo.tema}</Text>
        <Text style={styles.text}>Subtema: {reclamo.subtema || "No especificado"}</Text>
        <Text style={styles.text}>
          Fecha del incidente: {format(new Date(reclamo.fechaIncidente), "PPP", { locale: es })}
        </Text>
        <Text style={styles.subtitle}>Descripción:</Text>
        <Text style={styles.text}>{reclamo.descripcion}</Text>
        <Text style={styles.subtitle}>Ubicación:</Text>
        <Text style={styles.text}>{reclamo.ubicacion?.texto || "No especificada"}</Text>
        <Text style={styles.subtitle}>Notas:</Text>
        {reclamo.notas && reclamo.notas.length > 0 ? (
          reclamo.notas.map((nota, index) => (
            <Text key={index.toString()} style={styles.text}>
              {format(new Date(nota.fecha), "PPP p", { locale: es })}: {nota.texto}
            </Text>
          ))
        ) : (
          <Text style={styles.text}>No hay notas disponibles</Text>
        )}
      </View>
    </Page>
  </Document>
)

