import PropTypes from 'prop-types';

import { Controller } from "react-hook-form";
import { Button } from "../../ui/Button";
import { Input } from "../../ui/Input";
import { Label } from "../../ui/Label";
import { Textarea } from "../../ui/Textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/Select";
import { useProviderTypes } from "../../../hooks/useProviderTypes";

export function InvoiceForm({ form, onSubmit }) {
    const { control, handleSubmit, formState: { errors } } = form;

    // Cargar tipos de proveedores dinámicamente desde backend
    const { data: providerTypes = [] } = useProviderTypes();

    const TIPO_PAGO_CHOICES = [
        { value: 'contado', label: 'Contado' },
        { value: 'credito', label: 'Crédito' },
    ];

    const ESTADO_PROVISION_CHOICES = [
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'revision', label: 'En Revisión' },
        { value: 'disputada', label: 'Disputada' },
        { value: 'provisionada', label: 'Provisionada' },
        { value: 'anulada', label: 'Anulada' },
        { value: 'anulada_parcialmente', label: 'Anulada Parcialmente' },
        { value: 'rechazada', label: 'Rechazada' },
    ];

    const ESTADO_FACTURACION_CHOICES = [
        { value: 'pendiente', label: 'Pendiente' },
        { value: 'facturada', label: 'Facturada' },
    ];

    // NOTE: TIPO_COSTO_CHOICES are dynamic from CostType model, but for now, using a basic set.
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
                    <Label htmlFor="numero_factura">Número de Factura</Label>
                    <Controller
                        name="numero_factura"
                        control={control}
                        rules={{ required: "El número de factura es requerido" }}
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
                            required: "El monto es requerido",
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
                    <Label htmlFor="monto_original">Monto Original</Label>
                    <Controller
                        name="monto_original"
                        control={control}
                        render={({ field }) => (
                            <Input id="monto_original" type="number" step="0.01" {...field} readOnly />
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="monto_aplicable">Monto Aplicable</Label>
                    <Controller
                        name="monto_aplicable"
                        control={control}
                        render={({ field }) => (
                            <Input id="monto_aplicable" type="number" step="0.01" {...field} />
                        )}
                    />
                    {errors.monto_aplicable && (
                        <p className="text-red-500 text-sm mt-1">{errors.monto_aplicable.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="fecha_emision">Fecha de Emisión</Label>
                    <Controller
                        name="fecha_emision"
                        control={control}
                        rules={{ required: "La fecha de emisión es requerida" }}
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
                        rules={{ required: "El proveedor es requerido" }}
                        render={({ field }) => (
                            <Input id="proveedor_nombre" {...field} />
                        )}
                    />
                    {errors.proveedor_nombre && (
                        <p className="text-red-500 text-sm mt-1">{errors.proveedor_nombre.message}</p>
                    )}
                </div>

                <div>
                    <Label htmlFor="proveedor_id">ID Proveedor</Label>
                    <Controller
                        name="proveedor_id"
                        control={control}
                        render={({ field }) => (
                            <Input id="proveedor_id" type="number" {...field} />
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
                    <Label htmlFor="tipo_costo">Tipo de Costo</Label>
                    <Controller
                        name="tipo_costo"
                        control={control}
                        rules={{ required: "El tipo de costo es requerido" }}H
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
                    <Label htmlFor="tipo_pago">Tipo de Pago</Label>
                    <Controller
                        name="tipo_pago"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un tipo de pago" />
                                </SelectTrigger>
                                <SelectContent>
                                    {TIPO_PAGO_CHOICES.map(option => (
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
                    <Label htmlFor="ot_id">ID OT</Label>
                    <Controller
                        name="ot_id"
                        control={control}
                        render={({ field }) => (
                            <Input id="ot_id" type="number" {...field} />
                        )}
                    />
                </div>

                <div>
                    <Label htmlFor="estado_provision">Estado de Provisión</Label>
                    <Controller
                        name="estado_provision"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona estado de provisión" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADO_PROVISION_CHOICES.map(option => (
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
                    <Label htmlFor="estado_facturacion">Estado de Facturación</Label>
                    <Controller
                        name="estado_facturacion"
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona estado de facturación" />
                                </SelectTrigger>
                                <SelectContent>
                                    {ESTADO_FACTURACION_CHOICES.map(option => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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

            <Button type="submit">Guardar Cambios</Button>
        </form>
    );
}

InvoiceForm.propTypes = {
    form: PropTypes.object.isRequired,
    onSubmit: PropTypes.func.isRequired,
};