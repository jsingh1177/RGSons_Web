package MJC.RGSons.service;

import MJC.RGSons.model.ReportMaster;
import MJC.RGSons.repository.ReportMasterRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class ReportMasterService {

    @Autowired
    private ReportMasterRepository reportMasterRepository;

    public ReportMaster create(ReportMaster reportMaster) {
        if (reportMaster.getReportName() != null) {
            reportMaster.setReportName(reportMaster.getReportName().trim());
        }
        if (reportMaster.getDescription() != null) {
            reportMaster.setDescription(reportMaster.getDescription().trim());
        }
        if (reportMaster.getQuery() != null) {
            reportMaster.setQuery(reportMaster.getQuery().trim());
        }

        if (reportMaster.getReportName() == null || reportMaster.getReportName().isBlank()) {
            throw new RuntimeException("Report Name is required");
        }
        if (reportMaster.getQuery() == null || reportMaster.getQuery().isBlank()) {
            throw new RuntimeException("Query is required");
        }

        if (reportMasterRepository.existsByReportNameIgnoreCase(reportMaster.getReportName())) {
            throw new RuntimeException("Report Name already exists: " + reportMaster.getReportName());
        }

        if (reportMaster.getActive() == null) {
            reportMaster.setActive(true);
        }

        if (reportMaster.getCreatedAt() == null) {
            reportMaster.setCreatedAt(LocalDateTime.now());
        }
        reportMaster.setUpdateAt(LocalDateTime.now());

        return reportMasterRepository.save(reportMaster);
    }

    public List<ReportMaster> getAll() {
        return reportMasterRepository.findAll();
    }

    public Optional<ReportMaster> getById(Integer id) {
        return reportMasterRepository.findById(id);
    }

    public ReportMaster update(Integer id, ReportMaster details) {
        ReportMaster existing = reportMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found with id: " + id));

        if (details.getReportName() != null) {
            details.setReportName(details.getReportName().trim());
        }
        if (details.getDescription() != null) {
            details.setDescription(details.getDescription().trim());
        }
        if (details.getQuery() != null) {
            details.setQuery(details.getQuery().trim());
        }

        if (details.getReportName() == null || details.getReportName().isBlank()) {
            throw new RuntimeException("Report Name is required");
        }
        if (details.getQuery() == null || details.getQuery().isBlank()) {
            throw new RuntimeException("Query is required");
        }

        if (!existing.getReportName().equalsIgnoreCase(details.getReportName()) &&
                reportMasterRepository.existsByReportNameIgnoreCase(details.getReportName())) {
            throw new RuntimeException("Report Name already exists: " + details.getReportName());
        }

        existing.setReportName(details.getReportName());
        existing.setDescription(details.getDescription());
        existing.setQuery(details.getQuery());
        existing.setActive(details.getActive() == null ? existing.getActive() : details.getActive());
        existing.setUpdateAt(LocalDateTime.now());

        return reportMasterRepository.save(existing);
    }

    public void delete(Integer id) {
        ReportMaster existing = reportMasterRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Report not found with id: " + id));
        reportMasterRepository.delete(existing);
    }
}
