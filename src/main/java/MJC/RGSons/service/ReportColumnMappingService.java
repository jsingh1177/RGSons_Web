package MJC.RGSons.service;

import MJC.RGSons.model.ReportColumnMapping;
import MJC.RGSons.repository.ReportColumnMappingRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReportColumnMappingService {

    @Autowired
    private ReportColumnMappingRepository reportColumnMappingRepository;

    public List<ReportColumnMapping> getByReportId(Integer reportId) {
        if (reportId == null) {
            throw new RuntimeException("reportId is required");
        }
        return reportColumnMappingRepository.findByReportIdOrderBySortOrderAscIdAsc(reportId);
    }

    public ReportColumnMapping create(ReportColumnMapping mapping) {
        normalize(mapping);

        if (mapping.getReportId() == null) {
            throw new RuntimeException("reportId is required");
        }
        if (mapping.getColumnName() == null || mapping.getColumnName().isBlank()) {
            throw new RuntimeException("Column Name is required");
        }
        if (mapping.getDataType() == null || mapping.getDataType().isBlank()) {
            throw new RuntimeException("Data Type is required");
        }

        if (reportColumnMappingRepository.existsByReportIdAndColumnNameIgnoreCase(mapping.getReportId(), mapping.getColumnName())) {
            throw new RuntimeException("Column Name already exists for this report: " + mapping.getColumnName());
        }

        if (mapping.getVisible() == null) {
            mapping.setVisible(true);
        }
        if (mapping.getSortOrder() == null) {
            mapping.setSortOrder(0);
        }

        if (mapping.getCreatedAt() == null) {
            mapping.setCreatedAt(LocalDateTime.now());
        }
        mapping.setUpdateAt(LocalDateTime.now());

        return reportColumnMappingRepository.save(mapping);
    }

    public ReportColumnMapping update(Integer id, ReportColumnMapping details) {
        ReportColumnMapping existing = reportColumnMappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Column mapping not found with id: " + id));

        normalize(details);

        if (details.getColumnName() == null || details.getColumnName().isBlank()) {
            throw new RuntimeException("Column Name is required");
        }
        if (details.getDataType() == null || details.getDataType().isBlank()) {
            throw new RuntimeException("Data Type is required");
        }

        Integer reportId = existing.getReportId();
        if (details.getReportId() != null) {
            reportId = details.getReportId();
        }
        if (reportId == null) {
            throw new RuntimeException("reportId is required");
        }

        if (!existing.getColumnName().equalsIgnoreCase(details.getColumnName())
                && reportColumnMappingRepository.existsByReportIdAndColumnNameIgnoreCase(reportId, details.getColumnName())) {
            throw new RuntimeException("Column Name already exists for this report: " + details.getColumnName());
        }

        existing.setReportId(reportId);
        existing.setColumnName(details.getColumnName());
        existing.setColumnHeader(details.getColumnHeader());
        existing.setDataType(details.getDataType());
        existing.setWidth(details.getWidth());
        existing.setVisible(details.getVisible() == null ? existing.getVisible() : details.getVisible());
        existing.setSortOrder(details.getSortOrder() == null ? 0 : details.getSortOrder());
        existing.setUpdateAt(LocalDateTime.now());

        return reportColumnMappingRepository.save(existing);
    }

    public void delete(Integer id) {
        ReportColumnMapping existing = reportColumnMappingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Column mapping not found with id: " + id));
        reportColumnMappingRepository.delete(existing);
    }

    private void normalize(ReportColumnMapping mapping) {
        if (mapping == null) return;
        if (mapping.getColumnName() != null) {
            mapping.setColumnName(mapping.getColumnName().trim());
        }
        if (mapping.getColumnHeader() != null) {
            mapping.setColumnHeader(mapping.getColumnHeader().trim());
        }
        if (mapping.getDataType() != null) {
            mapping.setDataType(mapping.getDataType().trim());
        }
    }
}
