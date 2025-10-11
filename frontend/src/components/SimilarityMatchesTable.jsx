/**
 * Tabla para mostrar sugerencias de similitud de aliases
 * Incluye scores, impacto en OTs y acciones para aprobar/rechazar
 */

import PropTypes from "prop-types";
import { TrendingUp, CheckCircle, XCircle, FileText } from "lucide-react";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";

export function SimilarityMatchesTable({
    matches,
    onApprove,
    onReject,
    isLoading = false,
}) {
    const getScoreBadgeVariant = (score) => {
        if (score >= 95) return "success";
        if (score >= 85) return "blue";
        if (score >= 75) return "warning";
        return "secondary";
    };

    const getScoreLabel = (score) => {
        if (score >= 95) return "Casi Exacto";
        if (score >= 85) return "Alta Similitud";
        if (score >= 75) return "Media Similitud";
        return "Baja Similitud";
    };

    if (!matches || matches.length === 0) {
        return (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <TrendingUp className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                    No hay sugerencias pendientes
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                    Usa &quot;Detectar Duplicados&quot; para generar sugerencias
                </p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alias 1
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Alias 2
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Similitud
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Método
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Acciones
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {matches.map((match) => (
                        <tr
                            key={match.id}
                            className="hover:bg-gray-50 transition-colors"
                        >
                            <td className="px-6 py-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {match.alias_1.original_name}
                                    </div>
                                    {match.alias_1.country && (
                                        <div className="text-xs text-gray-500">
                                            {match.alias_1.country}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        <FileText className="w-3 h-3 inline mr-1" />
                                        {match.alias_1.usage_count || 0} usos
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div>
                                    <div className="text-sm font-medium text-gray-900">
                                        {match.alias_2.original_name}
                                    </div>
                                    {match.alias_2.country && (
                                        <div className="text-xs text-gray-500">
                                            {match.alias_2.country}
                                        </div>
                                    )}
                                    <div className="text-xs text-gray-500 mt-1">
                                        <FileText className="w-3 h-3 inline mr-1" />
                                        {match.alias_2.usage_count || 0} usos
                                    </div>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex flex-col gap-1">
                                    <Badge
                                        variant={getScoreBadgeVariant(
                                            match.similarity_score
                                        )}
                                    >
                                        {match.similarity_score.toFixed(1)}%
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                        {getScoreLabel(match.similarity_score)}
                                    </span>
                                </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                                <span className="text-xs text-gray-500">
                                    {match.detection_method ===
                                    "batch_fuzzywuzzy"
                                        ? "Detección Auto"
                                        : match.detection_method === "manual"
                                        ? "Manual"
                                        : match.detection_method}
                                </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex justify-end gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => onApprove(match)}
                                        disabled={isLoading}
                                        className="bg-green-600 hover:bg-green-700"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Normalizar
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onReject(match)}
                                        disabled={isLoading}
                                        className="border-red-300 text-red-700 hover:bg-red-50"
                                    >
                                        <XCircle className="w-4 h-4 mr-1" />
                                        Rechazar
                                    </Button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

SimilarityMatchesTable.propTypes = {
    matches: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
                .isRequired,
            alias_1: PropTypes.shape({
                original_name: PropTypes.string.isRequired,
                country: PropTypes.string,
                usage_count: PropTypes.number,
            }).isRequired,
            alias_2: PropTypes.shape({
                original_name: PropTypes.string.isRequired,
                country: PropTypes.string,
                usage_count: PropTypes.number,
            }).isRequired,
            similarity_score: PropTypes.number.isRequired,
            detection_method: PropTypes.string,
        })
    ),
    onApprove: PropTypes.func.isRequired,
    onReject: PropTypes.func.isRequired,
    isLoading: PropTypes.bool,
};

SimilarityMatchesTable.defaultProps = {
    matches: [],
    isLoading: false,
};
