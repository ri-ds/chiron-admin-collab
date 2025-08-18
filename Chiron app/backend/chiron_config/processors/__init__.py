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



from chiron.processors.registration import ProcessorRegistry
from .etl_processors import EtlName, EtlEncCostAsString, EtlLabCodeCustomSort

from chiron.processors.abstract import ConceptHandler
from chiron.processors import CohortDefTextCustomSort, DisplayTextCustomSort, SourceCsv


class EncCostAsStringHandler(ConceptHandler):
    display_name = "text with custom sort"

    def set_kwarg_options(self):
        pass

    def set_etl_processor(self, concept):
        self.etl_processor = EtlEncCostAsString(concept)

    def set_cohort_def_processor(self, chironuser, dataset, concept, prefilter_value):
        self.cohort_def_processor = CohortDefTextCustomSort(
            chironuser, dataset, concept, prefilter_value=prefilter_value
        )

    def set_display_processor(self, chironuser, concept):
        self.display_processor = DisplayTextCustomSort(
            chironuser, concept, sort_data_type="number"
        )


ProcessorRegistry.register(
    source_processors=[SourceCsv],
    concept_handlers=[
        EncCostAsStringHandler,
    ],
)


class NameHandler(ConceptHandler):
    display_name = "full name"

    def set_kwarg_options(self):
        pass

    def set_etl_processor(self, concept):
        self.etl_processor = EtlName(concept)

    def set_cohort_def_processor(self, chironuser, dataset, concept, prefilter_value):
        self.cohort_def_processor = CohortDefTextCustomSort(
            chironuser, dataset, concept, prefilter_value=prefilter_value
        )

    def set_display_processor(self, chironuser, concept):
        self.display_processor = DisplayTextCustomSort(chironuser, concept)


ProcessorRegistry.register(
    source_processors=[SourceCsv],
    concept_handlers=[
        NameHandler,
    ],
)


class LabCodeCustomSortHandler(ConceptHandler):
    display_name = "lab code with strange sort"

    def set_kwarg_options(self):
        pass

    def set_etl_processor(self, concept):
        self.etl_processor = EtlLabCodeCustomSort(concept)

    def set_cohort_def_processor(self, chironuser, dataset, concept, prefilter_value):
        self.cohort_def_processor = CohortDefTextCustomSort(
            chironuser, dataset, concept, prefilter_value=prefilter_value
        )

    def set_display_processor(self, chironuser, concept):
        self.display_processor = DisplayTextCustomSort(
            chironuser, concept, sort_data_type="number"
        )


ProcessorRegistry.register(
    source_processors=[SourceCsv],
    concept_handlers=[
        LabCodeCustomSortHandler,
    ],
)
