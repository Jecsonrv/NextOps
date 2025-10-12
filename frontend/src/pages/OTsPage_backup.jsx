export function OTsPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState(() => createInitialFilters());
    const [showFilters, setShowFilters] = useState(false);
    const [showBulkSearch, setShowBulkSearch] = useState(false);
    const [showProvisionModal, setShowProvisionModal] = useState(false);
    const [page, setPage] = useState(1);
    const [bulkSearchText, setBulkSearchText] = useState("");

    const normalizedSearch = search.trim();
    const filtersKey = JSON.stringify(filters);
    const hasFilterSelections = Boolean(
        filters.estados.length ||
            filters.clientes.length ||
            filters.operativos.length ||
            filters.proveedores.length ||
            filters.estado_provision ||
            filters.estado_facturado ||
            filters.tipo_operacion ||
            filters.bulk_search_values.length
    );
    const hasActiveFilters = Boolean(normalizedSearch || hasFilterSelections);

    const handleClearSearch = () => {
        if (!search) return;
        setSearch("");
        resetPage();
    };

    const resetPage = () => {
        setPage((current) => (current === 1 ? current : 1));
    };

    const handleSearchChange = (event) => {
        const value = event.target.value;
        setSearch(value);
        resetPage();
    };

    const handleMultiSelectChange = (key) => (selectedValues) => {
        const normalized = normalizeMultiValues(selectedValues);
        let hasChanges = false;

        setFilters((prev) => {
            if (arraysAreEqual(prev[key], normalized)) {
                return prev;
            }
            hasChanges = true;
            return {
                ...prev,
                [key]: normalized,
            };
        });

        if (hasChanges) {
            resetPage();
        }
    };

    const handleSingleSelectChange = (key) => (value) => {
        const normalized =
            value === SINGLE_SELECT_CLEAR_VALUE
                ? ""
                : normalizeSingleValue(value);
        let hasChanges = false;

        setFilters((prev) => {
            const previousValue = normalizeSingleValue(prev[key]);
            if (previousValue === normalized) {
                return prev;
            }
            hasChanges = true;
            return {
                ...prev,
                [key]: normalized,
            };
        });

        if (hasChanges) {
            resetPage();
        }
    };

    const handleClearFilters = () => {
        setFilters(() => createInitialFilters());
        setBulkSearchText("");
        resetPage();
    };

    // Función para procesar el texto de búsqueda masiva
    const processBulkSearchText = (text) => {
        if (!text.trim()) return [];

        // Separar por múltiples delimitadores: espacios, comas, saltos de línea, tabs, punto y coma
        const values = text
            .split(/[\s,;\n\r\t]+/)
            .map((v) => v.trim())
            .filter(Boolean);

        // Eliminar duplicados
        return [...new Set(values)];
    };

    // Handler para cambios en el textarea de búsqueda masiva
    const handleBulkSearchTextChange = (event) => {
        const text = event.target.value;
        setBulkSearchText(text);
        // No aplicar la búsqueda automáticamente, esperar a que el usuario presione el botón
    };

    // Handler para aplicar la búsqueda masiva
    const handleApplyBulkSearch = () => {
        const processedValues = processBulkSearchText(bulkSearchText);

        console.log("🚀 Aplicando búsqueda masiva:", {
            tipo: filters.bulk_search_type,
            textoOriginal: bulkSearchText,
            valoresProcesados: processedValues,
            cantidad: processedValues.length,
        });

        setFilters((prev) => ({
            ...prev,
            bulk_search_values: processedValues,
        }));

        resetPage();
    };

    // Handler para cambiar el tipo de búsqueda masiva
    const handleBulkSearchTypeChange = (value) => {
        const normalized = value === SINGLE_SELECT_CLEAR_VALUE ? "" : value;

        setFilters((prev) => ({
            ...prev,
            bulk_search_type: normalized,
            // Si se limpia el tipo, limpiar los valores aplicados también
            bulk_search_values: normalized ? prev.bulk_search_values : [],
        }));

        if (!normalized) {
            setBulkSearchText("");
            // Solo resetear página si estamos limpiando valores aplicados
            if (filters.bulk_search_values.length > 0) {
                resetPage();
            }
        }
        // No resetear página al cambiar tipo, solo al aplicar búsqueda
    };

    // Función helper para construir los parámetros de filtrado
    const buildFilterParams = (includePageParams = true) => {
        const params = new URLSearchParams();

        if (includePageParams) {
            params.append("page", page.toString());
            params.append("page_size", "20");
        }
        // Si NO incluye page params, NO agregamos page_size tampoco
        // El endpoint cards-stats no necesita page_size (solo cuenta)

        // Solo agregar parámetros si tienen valor
        if (normalizedSearch) {
            params.append("search", normalizedSearch);
        }
        // Multi-select: agregar cada estado
        if (filters.estados?.length) {
            filters.estados.forEach((estado) => {
                params.append("estado", estado);
            });
        }
        // Multi-select: agregar cada cliente como parámetro separado
        if (filters.clientes?.length) {
            filters.clientes.forEach((cliente) => {
                params.append("cliente", cliente);
            });
        }
        // Multi-select: agregar cada operativo
        if (filters.operativos?.length) {
            filters.operativos.forEach((operativo) => {
                params.append("operativo", operativo);
            });
        }
        // Multi-select: agregar cada proveedor
        if (filters.proveedores?.length) {
            filters.proveedores.forEach((proveedor) => {
                params.append("proveedor", proveedor);
            });
        }
        if (filters.estado_provision) {
            params.append("estado_provision", filters.estado_provision);
        }
        if (filters.estado_facturado) {
            params.append("estado_facturado", filters.estado_facturado);
        }
        if (filters.tipo_operacion) {
            params.append("tipo_operacion", filters.tipo_operacion);
        }

        // Búsqueda masiva
        if (filters.bulk_search_type && filters.bulk_search_values?.length) {
            filters.bulk_search_values.forEach((value) => {
                // Mapear el tipo de búsqueda al parámetro correcto
                if (filters.bulk_search_type === "mbl") {
                    params.append("mbl", value);
                } else if (filters.bulk_search_type === "contenedor") {
                    params.append("contenedor", value);
                } else if (filters.bulk_search_type === "ot") {
                    params.append("numero_ot", value);
                }
            });
        }

        return params;
    };

    // Fetch OTs data (paginado)
    const { data, isLoading, error } = useQuery({
        queryKey: ["ots", page, normalizedSearch, filtersKey],
        queryFn: async () => {
            const params = buildFilterParams(true);
            const response = await apiClient.get(`/ots/?${params}`);
            return response.data;
        },
    });

    // Fetch estadísticas para las cards (usa endpoint específico con agregaciones DB)
    const { data: cardsStats } = useQuery({
        queryKey: ["ots-cards-stats", normalizedSearch, filtersKey],
        queryFn: async () => {
            const params = buildFilterParams(false);
            const paramsString = params.toString();

            const url = paramsString
                ? `/ots/cards-stats/?${paramsString}`
                : `/ots/cards-stats/`;

            const response = await apiClient.get(url);
            return response.data;
        },
        staleTime: 30000, // Cache de 30 segundos
        keepPreviousData: true, // Evitar parpadeos
        retry: 1, // Reintentar 1 vez si falla
    });

    // Fetch unique filter values (con filtros aplicados de forma inteligente)
    // Para cada campo, aplicamos todos los filtros EXCEPTO el del campo mismo
    const { data: filterValues } = useQuery({
        queryKey: ["ots-filter-values", filtersKey, normalizedSearch],
        queryFn: async () => {
            // Función helper para construir params excluyendo un campo específico
            const buildParamsExcluding = (excludeField) => {
                const params = new URLSearchParams({
                    page_size: "1000",
                });

                if (normalizedSearch) {
                    params.append("search", normalizedSearch);
                }

                // Aplicar filtros de estado multi-select
                if (filters.estados?.length && excludeField !== "estados") {
                    filters.estados.forEach((estado) => {
                        params.append("estado", estado);
                    });
                }
                if (
                    filters.estado_provision &&
                    excludeField !== "estado_provision"
                ) {
                    params.append("estado_provision", filters.estado_provision);
                }
                if (
                    filters.estado_facturado &&
                    excludeField !== "estado_facturado"
                ) {
                    params.append("estado_facturado", filters.estado_facturado);
                }
                if (
                    filters.tipo_operacion &&
                    excludeField !== "tipo_operacion"
                ) {
                    params.append("tipo_operacion", filters.tipo_operacion);
                }

                // Aplicar filtros multi-select (excluyendo el campo actual)
                if (filters.clientes?.length && excludeField !== "clientes") {
                    filters.clientes.forEach((cliente) => {
                        params.append("cliente", cliente);
                    });
                }
                if (
                    filters.operativos?.length &&
                    excludeField !== "operativos"
                ) {
                    filters.operativos.forEach((operativo) => {
                        params.append("operativo", operativo);
                    });
                }
                if (
                    filters.proveedores?.length &&
                    excludeField !== "proveedores"
                ) {
                    filters.proveedores.forEach((proveedor) => {
                        params.append("proveedor", proveedor);
                    });
                }

                return params;
            };

            // Obtener datos para cada campo excluyendo su propio filtro
            const [
                clientesResponse,
                operativosResponse,
                proveedoresResponse,
                estadosResponse,
                estadosProvisionResponse,
                estadosFacturadoResponse,
            ] = await Promise.all([
                apiClient.get(`/ots/?${buildParamsExcluding("clientes")}`),
                apiClient.get(`/ots/?${buildParamsExcluding("operativos")}`),
                apiClient.get(`/ots/?${buildParamsExcluding("proveedores")}`),
                apiClient.get(`/ots/?${buildParamsExcluding("estados")}`),
                apiClient.get(
                    `/ots/?${buildParamsExcluding("estado_provision")}`
                ),
                apiClient.get(
                    `/ots/?${buildParamsExcluding("estado_facturado")}`
                ),
            ]);

            // Extraer valores únicos de cada response
            const clientes = [
                ...new Set(
                    clientesResponse.data.results
                        .map((ot) => ot.cliente_nombre)
                        .filter(Boolean)
                ),
            ].sort();

            const operativos = [
                ...new Set(
                    operativosResponse.data.results
                        .map((ot) => ot.operativo)
                        .filter(Boolean)
                ),
            ].sort();

            const proveedores = [
                ...new Set(
                    proveedoresResponse.data.results
                        .map((ot) => ot.proveedor_nombre)
                        .filter(Boolean)
                ),
            ].sort();

            const estados = [
                ...new Set(
                    estadosResponse.data.results
                        .map((ot) => ot.estado)
                        .filter(Boolean)
                ),
            ].sort();

            const estados_provision = [
                ...new Set(
                    estadosProvisionResponse.data.results
                        .map((ot) => ot.estado_provision)
                        .filter(Boolean)
                ),
            ].sort();

            const estados_facturado = [
                ...new Set(
                    estadosFacturadoResponse.data.results
                        .map((ot) => ot.estado_facturado)
                        .filter(Boolean)
                ),
            ].sort();

            return {
                clientes,
                operativos,
                proveedores,
                estados,
                estados_provision,
                estados_facturado,
            };
        },
        staleTime: 5 * 60 * 1000, // Cache por 5 minutos
    });

    const handleExport = async () => {
        try {
            // Construir los mismos parámetros que usa el listado
            const params = buildFilterParams(false); // false = sin paginación

            // Hacer request al backend para obtener el archivo Excel
            const response = await apiClient.get(`/ots/export-excel/?${params}`, {
                responseType: 'blob', // Importante para archivos binarios
            });

            // Crear URL del blob y descargar
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            // Extraer nombre del archivo del header Content-Disposition
            const contentDisposition = response.headers['content-disposition'];
            let filename = 'OTs_Export.xlsx';
            if (contentDisposition) {
                const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
                if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                }
            }

            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('Excel exportado correctamente');
        } catch (error) {
            console.error('Error al exportar Excel:', error);
            toast.error('Error al exportar a Excel. Por favor intenta nuevamente.');
        }
    };

    // Mutation para eliminar OT
    const deleteMutation = useMutation({
        mutationFn: async (otId) => {
            await apiClient.delete(`/ots/${otId}/`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries(["ots"]);
            queryClient.invalidateQueries(["ots-stats"]);
        },
    });

    const handleDelete = (ot) => {
        if (
            window.confirm(`¿Estás seguro de eliminar la OT ${ot.numero_ot}?`)
        ) {
            deleteMutation.mutate(ot.id);
        }
    };

    if (error) {
        return (
            <div className="p-4 text-center">
                <p className="text-red-600">
                    Error al cargar las OTs: {error.message}
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Cards - Dinámicas basadas en datos filtrados */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Total Órdenes
                        </CardTitle>
                        <Layers className="w-5 h-5 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-900">
                            {cardsStats?.total || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {hasActiveFilters
                                ? "Resultados filtrados"
                                : "Total en sistema"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Facturadas
                        </CardTitle>
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-green-600">
                            {cardsStats?.facturadas || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Con fecha de facturación
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Cerradas
                        </CardTitle>
                        <XCircle className="w-5 h-5 text-gray-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-gray-700">
                            {cardsStats?.cerradas || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Estado cerrado
                        </p>
                    </CardContent>
                </Card>

                <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-gray-600">
                            Pendientes Cierre
                        </CardTitle>
                        <Clock className="w-5 h-5 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold text-yellow-600">
                            {cardsStats?.pendientes_cierre || 0}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            Estado finalizado
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Barra de búsqueda y acciones mejorada */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search */}
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder="Buscar por OT, MBL, contenedor, cliente..."
                                    value={search}
                                    onChange={handleSearchChange}
                                    className="pl-10 h-10"
                                />
                                {search && (
                                    <button
                                        onClick={handleClearSearch}
                                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowFilters(!showFilters)}
                                className={
                                    showFilters
                                        ? "bg-blue-50 border-blue-300"
                                        : ""
                                }
                            >
                                <Filter className="w-4 h-4 mr-2" />
                                Filtros
                                {hasFilterSelections && (
                                    <Badge
                                        variant="default"
                                        className="ml-2 px-1.5 py-0.5 text-xs"
                                    >
                                        {[
                                            filters.estados.length,
                                            filters.clientes.length,
                                            filters.operativos.length,
                                            filters.proveedores.length,
                                            filters.estado_provision ? 1 : 0,
                                            filters.estado_facturado ? 1 : 0,
                                            filters.tipo_operacion ? 1 : 0,
                                        ].reduce((a, b) => a + b, 0)}
                                    </Badge>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                    setShowBulkSearch(!showBulkSearch)
                                }
                                className={
                                    showBulkSearch
                                        ? "bg-blue-50 border-blue-300"
                                        : ""
                                }
                            >
                                <Layers className="w-4 h-4 mr-2" />
                                Búsqueda Masiva
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/ots/import")}
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Importar
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowProvisionModal(true)}
                                className="border-blue-600 text-blue-600 hover:bg-blue-50"
                            >
                                <Upload className="w-4 h-4 mr-2" />
                                Provisión Acajutla
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleExport}
                                disabled={!data?.results?.length}
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Exportar
                            </Button>
                        </div>
                    </div>

                    {/* Panel de Filtros */}
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {/* Filtro por Estado */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Estatus
                                </label>
                                <MultiSelect
                                    options={filterValues?.estados || []}
                                    selected={filters.estados}
                                    onChange={handleMultiSelectChange(
                                        "estados"
                                    )}
                                    placeholder="Todos los estatus"
                                    formatDisplay={formatEstadoDisplay}
                                />
                            </div>

                            {/* Filtro por Cliente */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Cliente
                                </label>
                                <MultiSelect
                                    options={filterValues?.clientes || []}
                                    selected={filters.clientes}
                                    onChange={handleMultiSelectChange(
                                        "clientes"
                                    )}
                                    placeholder="Todos los clientes"
                                />
                            </div>

                            {/* Filtro por Operativo */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Operativo
                                </label>
                                <MultiSelect
                                    options={filterValues?.operativos || []}
                                    selected={filters.operativos}
                                    onChange={handleMultiSelectChange(
                                        "operativos"
                                    )}
                                    placeholder="Todos los operativos"
                                />
                            </div>

                            {/* Filtro por Naviera/Proveedor */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Naviera
                                </label>
                                <MultiSelect
                                    options={filterValues?.proveedores || []}
                                    selected={filters.proveedores}
                                    onChange={handleMultiSelectChange(
                                        "proveedores"
                                    )}
                                    placeholder="Todas las navieras"
                                />
                            </div>

                            {/* Filtro por Estado de Provisión */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Estado Provisión
                                </label>
                                <Select
                                    value={
                                        filters.estado_provision ||
                                        SINGLE_SELECT_CLEAR_VALUE
                                    }
                                    onValueChange={handleSingleSelectChange(
                                        "estado_provision"
                                    )}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value={SINGLE_SELECT_CLEAR_VALUE}
                                        >
                                            Todos
                                        </SelectItem>
                                        {filterValues?.estados_provision?.map(
                                            (estado) => (
                                                <SelectItem
                                                    key={estado}
                                                    value={estado}
                                                >
                                                    {formatEstadoDisplay(
                                                        estado
                                                    )}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Estado de Facturación */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Estado Facturación
                                </label>
                                <Select
                                    value={
                                        filters.estado_facturado ||
                                        SINGLE_SELECT_CLEAR_VALUE
                                    }
                                    onValueChange={handleSingleSelectChange(
                                        "estado_facturado"
                                    )}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value={SINGLE_SELECT_CLEAR_VALUE}
                                        >
                                            Todos
                                        </SelectItem>
                                        {filterValues?.estados_facturado?.map(
                                            (estado) => (
                                                <SelectItem
                                                    key={estado}
                                                    value={estado}
                                                >
                                                    {formatEstadoDisplay(
                                                        estado
                                                    )}
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filtro por Tipo de Operación */}
                            <div>
                                <label className="text-sm font-medium text-gray-700 mb-1 block">
                                    Tipo de Operación
                                </label>
                                <Select
                                    value={
                                        filters.tipo_operacion ||
                                        SINGLE_SELECT_CLEAR_VALUE
                                    }
                                    onValueChange={handleSingleSelectChange(
                                        "tipo_operacion"
                                    )}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Todos" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value={SINGLE_SELECT_CLEAR_VALUE}
                                        >
                                            Todos
                                        </SelectItem>
                                        <SelectItem value="importacion">
                                            Importación
                                        </SelectItem>
                                        <SelectItem value="exportacion">
                                            Exportación
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Panel de Búsqueda Masiva - Independiente */}
            {showBulkSearch && (
                <Card className="border-blue-200 bg-blue-50/30">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Layers className="w-5 h-5 text-blue-600" />
                                <CardTitle className="text-lg">
                                    Búsqueda Masiva
                                </CardTitle>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setShowBulkSearch(false);
                                    // Limpiar búsqueda masiva al cerrar
                                    setFilters((prev) => ({
                                        ...prev,
                                        bulk_search_type: "",
                                        bulk_search_values: [],
                                    }));
                                    setBulkSearchText("");
                                }}
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                            Busca múltiples órdenes simultáneamente usando diferentes criterios
                        </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-1">
                                <label className="text-sm font-medium text-gray-700 mb-2 block">
                                    Tipo de Búsqueda
                                </label>
                                <Select
                                    value={
                                        filters.bulk_search_type ||
                                        SINGLE_SELECT_CLEAR_VALUE
                                    }
                                    onValueChange={handleBulkSearchTypeChange}
                                >
                                    <SelectTrigger className="bg-white">
                                        <SelectValue placeholder="Seleccionar..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem
                                            value={SINGLE_SELECT_CLEAR_VALUE}
                                        >
                                            Ninguno
                                        </SelectItem>
                                        <SelectItem value="mbl">
                                            🚢 Por MBL
                                        </SelectItem>
                                        <SelectItem value="contenedor">
                                            📦 Por Contenedor
                                        </SelectItem>
                                        <SelectItem value="ot">
                                            📋 Por Número de OT
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {filters.bulk_search_type && (
                                <div className="md:col-span-3">
                                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                                        Valores a Buscar
                                        <span className="text-gray-500 font-normal ml-2">
                                            (separados por espacios, comas,
                                            saltos de línea...)
                                        </span>
                                    </label>
                                    <textarea
                                        value={bulkSearchText}
                                        onChange={handleBulkSearchTextChange}
                                        placeholder={`Ejemplo: ${
                                            filters.bulk_search_type === "mbl"
                                                ? "MBL001, MBL002, MBL003"
                                                : filters.bulk_search_type ===
                                                  "contenedor"
                                                ? "MSCU1234567 TEMU2345678 CMAU3456789"
                                                : "OT-001\nOT-002\nOT-003"
                                        }`}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] font-mono text-sm bg-white resize-y"
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <div className="text-sm text-gray-600">
                                            {bulkSearchText.trim() && (
                                                <>
                                                    <span className="font-medium text-blue-600">
                                                        {
                                                            processBulkSearchText(
                                                                bulkSearchText
                                                            ).length
                                                        }
                                                    </span>{" "}
                                                    {filters.bulk_search_type ===
                                                    "mbl"
                                                        ? "MBLs"
                                                        : filters.bulk_search_type ===
                                                          "contenedor"
                                                        ? "contenedores"
                                                        : "OTs"}{" "}
                                                    detectados
                                                </>
                                            )}
                                            {filters.bulk_search_values.length >
                                                0 && (
                                                <span className="ml-2 text-green-600 font-medium">
                                                    ✓{" "}
                                                    {
                                                        filters
                                                            .bulk_search_values
                                                            .length
                                                    }{" "}
                                                    aplicados
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {bulkSearchText && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        setBulkSearchText("")
                                                    }
                                                >
                                                    Limpiar
                                                </Button>
                                            )}
                                            <Button
                                                size="sm"
                                                onClick={handleApplyBulkSearch}
                                                disabled={
                                                    !bulkSearchText.trim()
                                                }
                                                className="bg-blue-600 hover:bg-blue-700"
                                            >
                                                <Search className="w-4 h-4 mr-2" />
                                                Aplicar Búsqueda
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Indicadores de Filtros Activos */}
            {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 items-center">
                    <span className="text-sm font-medium text-gray-700">
                        Filtros activos:
                    </span>
                    {normalizedSearch && (
                        <Badge variant="secondary" className="gap-1">
                            Búsqueda: {normalizedSearch}
                            <button
                                onClick={handleClearSearch}
                                className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </Badge>
                    )}
                    {filters.estados.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Estados: {filters.estados.length}
                        </Badge>
                    )}
                    {filters.clientes.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Clientes: {filters.clientes.length}
                        </Badge>
                    )}
                    {filters.operativos.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Operativos: {filters.operativos.length}
                        </Badge>
                    )}
                    {filters.proveedores.length > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            Navieras: {filters.proveedores.length}
                        </Badge>
                    )}
                    {(filters.estado_provision ||
                        filters.estado_facturado ||
                        filters.tipo_operacion) && (
                        <Badge variant="secondary">
                            +
                            {
                                [
                                    filters.estado_provision,
                                    filters.estado_facturado,
                                    filters.tipo_operacion,
                                ].filter(Boolean).length
                            }{" "}
                            más
                        </Badge>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearFilters}
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 hover:text-red-700 font-medium"
                    >
                        <X className="w-4 h-4 mr-1.5" />
                        Limpiar todos los filtros
                    </Button>
                </div>
            )}

            {/* OTs Table */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Órdenes de Trabajo</CardTitle>
                        {data?.count > 0 && (
                            <span className="text-sm text-gray-500">
                                Mostrando {data.results.length} de {data.count} órdenes
                            </span>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-12">
                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <p className="mt-2 text-sm text-gray-600">
                                Cargando OTs...
                            </p>
                        </div>
                    ) : (data?.results?.length ?? 0) === 0 ? (
                        hasActiveFilters ? (
                            <div className="text-center py-12">
                                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    No encontramos coincidencias
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    Ajusta la búsqueda o limpia los filtros para
                                    ver más resultados.
                                </p>
                                <div className="mt-6 flex flex-wrap justify-center gap-2">
                                    {hasFilterSelections && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearFilters}
                                        >
                                            Limpiar filtros
                                        </Button>
                                    )}
                                    {normalizedSearch && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleClearSearch}
                                        >
                                            Limpiar búsqueda
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Truck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-gray-900">
                                    Aún no tienes órdenes registradas
                                </h3>
                                <p className="mt-2 text-sm text-gray-600">
                                    Importa un archivo Excel con tus órdenes de trabajo para comenzar.
                                </p>
                                <p className="mt-1 text-xs text-gray-500">
                                    Usa el botón &quot;Importar&quot; en la
                                    parte superior.
                                </p>
                            </div>
                        )
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-200">
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                OT
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Estatus
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Cliente
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Operativo
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                MBL
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Contenedores
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Naviera
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Barco
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                F. Provisión
                                            </th>
                                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                F. Facturación
                                            </th>
                                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-600 uppercase tracking-wider">
                                                Acciones
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {data?.results?.map((ot) => (
                                            <tr
                                                key={ot.id}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Link
                                                            to={`/ots/${ot.id}`}
                                                            className="font-medium text-blue-600 hover:text-blue-800"
                                                        >
                                                            {ot.numero_ot}
                                                        </Link>
                                                        {ot.tipo_operacion ===
                                                            "exportacion" && (
                                                            <Badge
                                                                variant="warning"
                                                                className="text-xs"
                                                            >
                                                                EXP
                                                            </Badge>
                                                        )}
                                                        {ot.has_disputed_invoices && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                                title={`${ot.disputed_invoices_count} factura(s) disputada(s) - $${ot.disputed_invoices_amount?.toLocaleString()}`}
                                                            >
                                                                {ot.disputed_invoices_count} Disputa{ot.disputed_invoices_count > 1 ? 's' : ''}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <Badge
                                                            variant={
                                                                estadoColors[
                                                                    ot.estado
                                                                ] || "default"
                                                            }
                                                        >
                                                            {ot.estado_display}
                                                        </Badge>
                                                        {ot.estado_provision === 'disputada' && (
                                                            <Badge
                                                                variant="destructive"
                                                                className="text-xs"
                                                            >
                                                                En Disputa
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-900">
                                                    {ot.cliente_nombre || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {ot.operativo || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {ot.mbl || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {ot.contenedores_list ||
                                                        "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {ot.proveedor_nombre || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {ot.barco || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(
                                                        ot.fecha_provision
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-gray-600">
                                                    {formatDate(
                                                        ot.fecha_recepcion_factura
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/ots/${ot.id}`
                                                                )
                                                            }
                                                            title="Ver detalle"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/ots/${ot.id}/edit`
                                                                )
                                                            }
                                                            title="Editar"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleDelete(ot)
                                                            }
                                                            title="Eliminar"
                                                            disabled={
                                                                deleteMutation.isPending
                                                            }
                                                        >
                                                            <Trash2 className="w-4 h-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {data?.count > 20 && (
                                <div className="mt-6 flex items-center justify-between">
                                    <p className="text-sm text-gray-600">
                                        Mostrando {(page - 1) * 20 + 1} -{" "}
                                        {Math.min(page * 20, data.count)} de{" "}
                                        {data.count} OTs
                                    </p>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1)
                                                )
                                            }
                                            disabled={!data.previous}
                                        >
                                            Anterior
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                            disabled={!data.next}
                                        >
                                            Siguiente
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Modal de Importar Provisión Acajutla */}
            <ProvisionAcajutlaModal
                isOpen={showProvisionModal}
                onClose={() => setShowProvisionModal(false)}
                onSuccess={() => {
                    queryClient.invalidateQueries(["ots"]);
                    queryClient.invalidateQueries(["ots-cards-stats"]);
                    setShowProvisionModal(false);
                }}
            />
        </div>
    );
}
