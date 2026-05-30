package MJC.RGSons.service;

import MJC.RGSons.model.Uom;
import MJC.RGSons.repository.UomRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.jdbc.core.JdbcTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class UomService {

    @Autowired
    private UomRepository uomRepository;

    @Autowired
    private SequenceGeneratorService sequenceGeneratorService;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private volatile boolean uomTableChecked = false;

    private void ensureUomTableExists() {
        if (uomTableChecked) return;
        synchronized (this) {
            if (uomTableChecked) return;
            try {
                Integer exists = jdbcTemplate.queryForObject(
                        "SELECT CASE WHEN EXISTS (" +
                                "SELECT 1 FROM INFORMATION_SCHEMA.TABLES " +
                                "WHERE LOWER(TABLE_NAME) = LOWER('UOM') AND LOWER(TABLE_SCHEMA) = LOWER('dbo')" +
                                ") THEN 1 ELSE 0 END",
                        Integer.class
                );
                if (exists != null && exists == 1) {
                    uomTableChecked = true;
                    return;
                }

                jdbcTemplate.execute(
                        "CREATE TABLE UOM (" +
                                "id INT IDENTITY(1,1) PRIMARY KEY, " +
                                "code VARCHAR(255) NOT NULL, " +
                                "name VARCHAR(255) NOT NULL, " +
                                "status BIT, " +
                                "created_at DATETIME, " +
                                "update_at DATETIME, " +
                                "CONSTRAINT UK_UOM_code UNIQUE (code), " +
                                "CONSTRAINT UK_UOM_name UNIQUE (name)" +
                                ")"
                );
                uomTableChecked = true;
            } catch (Exception e) {
                throw new RuntimeException("UOM table is missing and could not be created automatically. Please run the UOM CREATE TABLE script in your database. Error: " + e.getMessage());
            }
        }
    }

    public List<Uom> getAllUoms() {
        ensureUomTableExists();
        return uomRepository.findAll();
    }

    public Optional<Uom> getUomById(Integer id) {
        ensureUomTableExists();
        return uomRepository.findById(id);
    }

    public Optional<Uom> getUomByCode(String code) {
        ensureUomTableExists();
        return uomRepository.findByCode(code);
    }

    public Optional<Uom> getUomByName(String name) {
        ensureUomTableExists();
        if (name == null) return Optional.empty();
        return uomRepository.findByNameIgnoreCase(name.trim());
    }

    public List<Uom> getActiveUoms() {
        ensureUomTableExists();
        return uomRepository.findByStatusOrderByNameAsc(true);
    }

    public List<Uom> getUomsByStatus(Boolean status) {
        ensureUomTableExists();
        return uomRepository.findByStatus(status);
    }

    public List<Uom> searchUomsByName(String name) {
        ensureUomTableExists();
        final String q = name == null ? "" : name.trim();
        return uomRepository.findByNameContainingIgnoreCase(q);
    }

    public void validateUom(Uom uom) {
        if (uom == null) throw new RuntimeException("UOM is required");
        if (uom.getName() == null || uom.getName().trim().isEmpty()) {
            throw new RuntimeException("UOM name is required");
        }
    }

    public Uom createUom(Uom uom) {
        ensureUomTableExists();
        uom.setCode(sequenceGeneratorService.generateSequence("Master_SEQ"));
        uom.setName(uom.getName().trim());

        if (uomRepository.existsByNameIgnoreCase(uom.getName())) {
            throw new RuntimeException("UOM name already exists: " + uom.getName());
        }
        if (uomRepository.existsByCode(uom.getCode())) {
            throw new RuntimeException("UOM code already exists: " + uom.getCode());
        }

        if (uom.getStatus() == null) uom.setStatus(true);
        uom.setCreatedAt(LocalDateTime.now());
        uom.setUpdateAt(LocalDateTime.now());
        return uomRepository.save(uom);
    }

    public Uom updateUom(Integer id, Uom details) {
        ensureUomTableExists();
        Optional<Uom> opt = uomRepository.findById(id);
        if (opt.isEmpty()) {
            throw new RuntimeException("UOM not found with id: " + id);
        }

        Uom existing = opt.get();
        details.setName(details.getName().trim());

        if (!existing.getName().equalsIgnoreCase(details.getName()) && uomRepository.existsByNameIgnoreCase(details.getName())) {
            throw new RuntimeException("UOM name already exists: " + details.getName());
        }

        existing.setName(details.getName());
        if (details.getStatus() != null) {
            existing.setStatus(details.getStatus());
        }
        existing.setUpdateAt(LocalDateTime.now());
        return uomRepository.save(existing);
    }

    public void deleteUomById(Integer id) {
        ensureUomTableExists();
        Optional<Uom> opt = uomRepository.findById(id);
        if (opt.isEmpty()) {
            throw new RuntimeException("UOM not found with id: " + id);
        }

        Uom uom = opt.get();
        try {
            uomRepository.deleteById(id);
        } catch (Exception e) {
            uom.setStatus(false);
            uom.setUpdateAt(LocalDateTime.now());
            uomRepository.save(uom);
        }
    }
}
