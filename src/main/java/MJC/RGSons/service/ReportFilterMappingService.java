package MJC.RGSons.service;

import MJC.RGSons.model.ReportFilterMapping;
import MJC.RGSons.repository.ReportFilterMappingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportFilterMappingService {

    @Autowired
    private ReportFilterMappingRepository reportFilterMappingRepository;

    public List<ReportFilterMapping> getByReportId(Integer reportId) {
        if (reportId == null) {
            throw new RuntimeException("reportId is required");
        }
        return reportFilterMappingRepository.findByReportIdOrderBySortOrderAscIdAsc(reportId);
    }

    public ReportFilterMapping create(ReportFilterMapping mapping) {
        normalize(mapping);

        if (mapping.getReportId() == null) {
            throw new RuntimeException("reportId is required");
        }
        if (mapping.getFilterName() == null || mapping.getFilterName().isBlank()) {
            throw new RuntimeException("Filter Name is required");
        }
        if (mapping.getParameterName() == null || mapping.getParameterName().isBlank()) {
            throw new RuntimeException("Parameter Name is required");
        }
        if (mapping.getType() == null || mapping.getType().isBlank()) {
            throw new RuntimeException("Type is required");
        }

        if (reportFilterMappingRepository.existsByReportIdAndFilterNameIgnoreCase(mapping.getReportId(), mapping.getFilterName())) {
            throw new RuntimeException("Filter Name already exists for this report: " + mapping.getFilterName());
        }

        if (mapping.getRequired() == null) {
            mapping.setRequired(false);
        }
        if (mapping.getSortOrder() == null) {
            mapping.setSortOrder(0);
        }
        if (mapping.getActive() == null) {
            mapping.setActive(true);
        }

        if (mapping.getCreatedAt() == null) {
            mapping.setCreatedAt(LocalDateTime.now());
        }
        mapping.setUpdateAt(LocalDateTime.now());

        return reportFilterMappingRepository.save(mapping);
    }

    public ReportFilterMapping update(Integer id, ReportFilterMapping details) {
        ReportFilterMapping existing = reportFilterMappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Filter mapping not found with id: " + id));

        normalize(details);

        if (details.getFilterName() == null || details.getFilterName().isBlank()) {
            throw new RuntimeException("Filter Name is required");
        }
        if (details.getParameterName() == null || details.getParameterName().isBlank()) {
            throw new RuntimeException("Parameter Name is required");
        }
        if (details.getType() == null || details.getType().isBlank()) {
            throw new RuntimeException("Type is required");
        }

        Integer reportId = existing.getReportId();
        if (details.getReportId() != null) {
            reportId = details.getReportId();
        }
        if (reportId == null) {
            throw new RuntimeException("reportId is required");
        }

        if (!existing.getFilterName().equalsIgnoreCase(details.getFilterName())
                && reportFilterMappingRepository.existsByReportIdAndFilterNameIgnoreCase(reportId, details.getFilterName())) {
            throw new RuntimeException("Filter Name already exists for this report: " + details.getFilterName());
        }

        existing.setReportId(reportId);
        existing.setFilterName(details.getFilterName());
        existing.setFilterLabel(details.getFilterLabel());
        existing.setParameterName(details.getParameterName());
        existing.setType(details.getType());
        existing.setRequired(details.getRequired() == null ? existing.getRequired() : details.getRequired());
        existing.setDefaultValue(details.getDefaultValue());
        existing.setDropdownQuery(details.getDropdownQuery());
        existing.setSortOrder(details.getSortOrder() == null ? 0 : details.getSortOrder());
        existing.setActive(details.getActive() == null ? existing.getActive() : details.getActive());
        existing.setUpdateAt(LocalDateTime.now());

        return reportFilterMappingRepository.save(existing);
    }

    public void delete(Integer id) {
        ReportFilterMapping existing = reportFilterMappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Filter mapping not found with id: " + id));
        reportFilterMappingRepository.delete(existing);
    }

    private void normalize(ReportFilterMapping mapping) {
        if (mapping == null) return;
        if (mapping.getFilterName() != null) {
            mapping.setFilterName(mapping.getFilterName().trim());
        }
        if (mapping.getFilterLabel() != null) {
            mapping.setFilterLabel(mapping.getFilterLabel().trim());
        }
        if (mapping.getParameterName() != null) {
            mapping.setParameterName(mapping.getParameterName().trim());
        }
        if (mapping.getType() != null) {
            mapping.setType(mapping.getType().trim());
        }
        if (mapping.getDefaultValue() != null) {
            mapping.setDefaultValue(mapping.getDefaultValue().trim());
        }
        if (mapping.getDropdownQuery() != null) {
            mapping.setDropdownQuery(mapping.getDropdownQuery().trim());
        }
    }
}
