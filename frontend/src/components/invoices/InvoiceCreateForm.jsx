import { useForm, Controller } from "react-hook-form";
import PropTypes from 'prop-types';
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { Textarea } from "../../ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/Select";
import { Checkbox } from "../../ui/Checkbox";
import { useProviderTypes } from "../../../hooks/useProviderTypes";

export function InvoiceCreateForm({ onSubmit }) {
    const { control, handleSubmit, formState: { errors }, register } = useForm();

    // Cargar tipos de proveedores dinámicamente desde backend
    const { data: providerTypes = [] } = useProviderTypes();

    const TIPO_COSTO_BASIC_CHOICES = [
        { value: 'FLETE', label: 'Flete' },
        { value: 'CARGOS_NAVIERA', label: 'Cargos de Naviera' },
        { value: 'TRANSPORTE', label: 'Transporte' },
        { value: 'ADUANA', label: 'Aduana' },
        { value: 'ALMACENAJE', label: 'Almacenaje' },
        { value: 'DEMORA', label: 'Demora' },
        { value: 'OTRO', label: 'Otro' },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="file">Archivo de Factura (PDF, JSON, JPG, PNG)</Label>
                    <Input id="file" type="file" {...register("file", { required: "El archivo es requerido" })} />
                    {errors.file && (
                        <p className="text-red-500 text-sm mt-1">{errors.file.message}</p>
                    )}
                </div>

                <div className="flex items-center space-x-2 mt-6">
                    <Controller
                        name="auto_parse"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="auto_parse"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                            />
                        )}
                    />
                    <Label htmlFor="auto_parse">Intentar auto-extraer datos del archivo</Label>
                </div>

                <div>
                    <Label htmlFor="numero_factura">Número de Factura</Label>
                    <Controller
                        name="numero_factura"
                        control={control}
                        render={({ field }) => (
                            <Input id="numero_factura" {...field} />
                        )}
                    />
                    {errors.numero_factura && (
                        <p className="text-red-500 text-sm mt-1">{errors.numero_factura.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="monto">Monto Total</Label>
                    <Controller
                        name="monto"
                        control={control}
                        rules={{
                            pattern: {
                                value: /^[0-9]*\.?[0-9]*$/,
                                message: "Monto inválido",
                            },
                            min: {
                                value: 0.01,
                                message: "El monto debe ser mayor a 0",
                            }
                        }}
                        render={({ field }) => (
                            <Input id="monto" type="number" step="0.01" {...field} />
                        )}
                    />
                    {errors.monto && (
                        <p className="text-red-500 text-sm mt-1">{errors.monto.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="fecha_emision">Fecha de Emisión</Label>
                    <Controller
                        name="fecha_emision"
                        control={control}
                        render={({ field }) => (
                            <Input id="fecha_emision" type="date" {...field} />
                        )}
                    />
                    {errors.fecha_emision && (
                        <p className="text-red-500 text-sm mt-1">{errors.fecha_emision.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="fecha_vencimiento">Fecha de Vencimiento</Label>
                    <Controller
                        name="fecha_vencimiento"
                        control={control}
                        render={({ field }) => (
                            <Input id="fecha_vencimiento" type="date" {...field} />
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="proveedor_nombre">Proveedor</Label>
                    <Controller
                        name="proveedor_nombre"
                        control={control}
                        render={({ field }) => (
                            <Input id="proveedor_nombre" {...field} />
                        )}
                    />
                    {errors.proveedor_nombre && (
                        <p className="text-red-500 text-sm mt-1">{errors.proveedor_nombre.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="proveedor_nit">NIT Proveedor</Label>
                    <Controller
                        name="proveedor_nit"
                        control={control}
                        render={({ field }) => (
                            <Input id="proveedor_nit" {...field} />
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="tipo_proveedor">Tipo de Proveedor</Label>
                    <Controller
                        name="tipo_proveedor"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo de proveedor" />
                                </SelectTrigger>
                                <SelectContent>
                                    {providerTypes.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="proveedor_categoria">Categoría Proveedor</Label>
                    <Controller
                        name="proveedor_categoria"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="local">Local</SelectItem>
                                    <SelectItem value="internacional">Internacional</SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="tipo_costo">Tipo de Costo</Label>
                    <Controller
                        name="tipo_costo"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo de costo" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPO_COSTO_BASIC_CHOICES.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.tipo_costo && (
                        <p className="text-red-500 text-sm mt-1">{errors.tipo_costo.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="ot_number">Número de OT</Label>
                    <Controller
                        name="ot_number"
                        control={control}
                        render={({ field }) => (
                            <Input id="ot_number" {...field} />
                        )}
                    />
                </div>
            </div>

            <div>
                <Label htmlFor="notas">Notas</Label>
                <Controller
                    name="notas"
                    control={control}
                    render={({ field }) => (
                        <Textarea id="notas" rows="4" {...field} />
                    )}
                />
            </div>

            <Button type="submit">Crear Factura</Button>
        </form>
    );
}

InvoiceCreateForm.propTypes = {
    onSubmit: PropTypes.func.isRequired,
};