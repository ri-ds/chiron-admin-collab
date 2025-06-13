from chiron.processors import (
    ProcessorRegistry,
    get_built_in_standard_concept_handlers,
)

from .source_patient import SourcePatient
from .source_medication import SourceMedication
from .source_encounter import SourceEncounter
from .source_diagnosis import SourceDiagnosis
from .source_admission import SourceAdmission
from .source_procedure import SourceProcedure
from .source_biospecimen import SourceBiospecimen

from .handlers.ontology import OntologyHandler

ProcessorRegistry.register(
    [
        SourcePatient,
        SourceMedication,
        SourceEncounter,
        SourceDiagnosis,
        SourceProcedure,
        SourceBiospecimen,
        SourceAdmission,
    ],
    get_built_in_standard_concept_handlers(),
)

ProcessorRegistry.register([], [OntologyHandler])
