import PropTypes from 'prop-types';
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';
import PatternList from './PatternList';

export default function PatternGroupCard({ group, onAddPattern, onEditPattern }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Card>
            <CardHeader className="cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                <div className="flex justify-between items-center">
                    <CardTitle>{group.nombre}</CardTitle>
                    <div className="flex items-center">
                        <span className="text-sm text-gray-500 mr-4">{group.patrones_count} patrones</span>
                        {isOpen ? <ChevronDown /> : <ChevronRight />}
                    </div>
                </div>
            </CardHeader>
            {isOpen && (
                <CardContent>
                    <div className="mb-4">
                        <Button size="sm" variant="outline" onClick={() => onAddPattern(group)}>
                            <Plus className="w-4 h-4 mr-2" />
                            Añadir Patrón al Grupo
                        </Button>
                    </div>
                    <div className="border-t pt-4">
                        <PatternList groupId={group.id} onEditPattern={(p) => onEditPattern(p, group)} />
                    </div>
                </CardContent>
            )}
        </Card>
    );
}

PatternGroupCard.propTypes = {
    group: PropTypes.shape({
        id: PropTypes.number,
        nombre: PropTypes.string,
        patrones_count: PropTypes.number,
    }).isRequired,
    onAddPattern: PropTypes.func.isRequired,
    onEditPattern: PropTypes.func.isRequired,
};
