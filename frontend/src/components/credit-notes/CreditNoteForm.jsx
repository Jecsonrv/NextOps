import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "react-hot-toast";
import { useCreateCreditNote } from "../../hooks/useCreditNotes";
import { useInvoiceList } from "../../hooks/useInvoices";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Loader2, Upload, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/Select";

const creditNoteSchema = z.object({
  invoice: z.string().nonempty("La factura es obligatoria"),
  numero_nota: z.string().nonempty("El nÃºmero de nota es obligatorio"),
  monto: z.preprocess(
    (val) => parseFloat(val),
    z.number().positive("El monto debe ser mayor a cero")
  ),
  archivo: z.any().optional(),
});

export function CreditNoteForm() {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(creditNoteSchema),
  });

  const [file, setFile] = useState(null);

  const createCreditNote = useCreateCreditNote();
  const { data: invoices, isLoading: isLoadingInvoices } = useInvoiceList();

  const onSubmit = (data) => {
    const formData = new FormData();
    formData.append("invoice", data.invoice);
    formData.append("numero_nota", data.numero_nota);
    formData.append("monto", data.monto);
    if (file) {
      formData.append("archivo", file);
    }

    createCreditNote.mutate(formData, {
      onSuccess: () => {
        toast.success("Nota de crÃ©dito creada con Ã©xito");
        reset();
        setFile(null);
      },
      onError: (error) => {
        toast.error(
          `Error al crear la nota de crÃ©dito: ${error.response?.data?.detail}`
        );
      },
    });
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("El archivo no puede superar los 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subir Nueva Nota de CrÃ©dito</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="invoice">Factura Asociada</label>
            <Controller
              name="invoice"
              control={control}
              render={({ field }) => (
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isLoadingInvoices}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una factura..." />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices?.map((invoice) => (
                      <SelectItem key={invoice.id} value={invoice.id.toString()}>
                        {invoice.numero_factura} - {invoice.proveedor_nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.invoice && (
              <p className="text-red-500 text-sm">{errors.invoice.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="numero_nota">NÃºmero de Nota de CrÃ©dito</label>
            <Input
              id="numero_nota"
              {...register("numero_nota")}
              placeholder="NC-001"
            />
            {errors.numero_nota && (
              <p className="text-red-500 text-sm">{
                errors.numero_nota.message
              }</p>
            )}
          </div>

          <div>
            <label htmlFor="monto">Monto</label>
            <Input id="monto" type="number" step="0.01" {...register("monto")} />
            {errors.monto && (
              <p className="text-red-500 text-sm">{errors.monto.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="archivo">Archivo (PDF)</label>
            <div className="flex items-center gap-3">
              <label className="flex-1 flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-blue-400 transition-colors">
                <Upload className="w-5 h-5 text-gray-400 mr-2" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : "Seleccionar archivo PDF"}
                </span>
                <input
                  type="file"
                  id="archivo"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {file && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          <Button type="submit" disabled={createCreditNote.isLoading}>
            {createCreditNote.isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              "Guardar Nota de CrÃ©dito"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
