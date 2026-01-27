package MJC.RGSons.service;

import MJC.RGSons.model.Store;
import MJC.RGSons.model.VoucherConfig;
import MJC.RGSons.model.VoucherNumberLog;
import MJC.RGSons.model.VoucherSequence;
import MJC.RGSons.repository.StoreRepository;
import MJC.RGSons.repository.VoucherConfigRepository;
import MJC.RGSons.repository.VoucherNumberLogRepository;
import MJC.RGSons.repository.VoucherSequenceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class VoucherService {

    @Autowired
    private VoucherConfigRepository voucherConfigRepository;

    @Autowired
    private VoucherSequenceRepository voucherSequenceRepository;
    
    @Autowired
    private VoucherNumberLogRepository voucherNumberLogRepository;

    @Autowired
    private StoreRepository storeRepository;

    public VoucherConfig getVoucherConfig(String voucherType) {
        return voucherConfigRepository.findByVoucherType(voucherType).orElse(null);
    }

    public VoucherConfig saveVoucherConfig(VoucherConfig config) {
        Optional<VoucherConfig> existing = voucherConfigRepository.findByVoucherType(config.getVoucherType());
        if (existing.isPresent()) {
            config.setConfigId(existing.get().getConfigId());
            config.setCreatedAt(existing.get().getCreatedAt());
        }
        return voucherConfigRepository.save(config);
    }

    public String generatePreview(String voucherType, String storeCode) {
        VoucherConfig config = getVoucherConfig(voucherType);
        if (config == null) {
            // Return dummy preview if no config exists yet
            return "PUR-" + storeCode + "-2026-0001 (Default)";
        }

        LocalDate now = LocalDate.now();
        return constructVoucherString(config, storeCode, now, 1);
    }

    @Transactional
    public String generateVoucherNumber(String voucherType, String storeCode) {
        // 1. Get configuration
        VoucherConfig config = getVoucherConfig(voucherType);
        if (config == null || !Boolean.TRUE.equals(config.getIsActive())) {
            throw new RuntimeException("Voucher configuration not found or inactive for type: " + voucherType);
        }

        // Lookup Store ID if needed
        Integer storeId = null;
        if (storeCode != null) {
            Optional<Store> store = storeRepository.findByStoreCode(storeCode);
            if (store.isPresent()) {
                storeId = store.get().getId();
            } else if ("STORE_WISE".equalsIgnoreCase(config.getNumberingScope())) {
                throw new RuntimeException("Invalid Store Code: " + storeCode);
            }
        } else if ("STORE_WISE".equalsIgnoreCase(config.getNumberingScope())) {
             throw new RuntimeException("Store Code is required for STORE_WISE numbering scope");
        }

        return generateNextVoucherNumber(voucherType, storeId, storeCode);
    }
    
    @Transactional
    public String generateNextVoucherNumber(String voucherType, Integer storeId, String storeCode) {
        VoucherConfig config = getVoucherConfig(voucherType);
        if (config == null || !Boolean.TRUE.equals(config.getIsActive())) {
            throw new RuntimeException("Voucher configuration not found or inactive for type: " + voucherType);
        }

        LocalDate now = LocalDate.now();
        String resetKey = getResetKey(config.getResetFrequency(), now);
        Integer sequenceStoreId = "STORE_WISE".equalsIgnoreCase(config.getNumberingScope()) ? storeId : null;

        VoucherSequence sequence = voucherSequenceRepository
                .findByVoucherTypeAndStoreIdAndResetKey(voucherType, sequenceStoreId, resetKey)
                .orElse(new VoucherSequence());

        if (sequence.getSequenceId() == null) {
            sequence.setVoucherType(voucherType);
            sequence.setStoreId(sequenceStoreId);
            sequence.setResetKey(resetKey);
            sequence.setCurrentNumber(0);
        }

        int nextNumber = sequence.getCurrentNumber() + 1;
        sequence.setCurrentNumber(nextNumber);
        sequence.setLastGeneratedAt(java.time.LocalDateTime.now());
        
        voucherSequenceRepository.save(sequence);

        String voucherNumber = constructVoucherString(config, storeCode, now, nextNumber);
        
        // Log generation
        VoucherNumberLog log = new VoucherNumberLog();
        log.setVoucherType(voucherType);
        log.setStoreId(storeId);
        log.setVoucherNumber(voucherNumber);
        voucherNumberLogRepository.save(log);

        return voucherNumber;
    }

    private String getResetKey(String frequency, LocalDate date) {
        if (frequency == null || "NEVER".equalsIgnoreCase(frequency)) {
            return "GLOBAL";
        }
        if ("DAILY".equalsIgnoreCase(frequency)) {
            return date.toString(); // YYYY-MM-DD
        }
        if ("MONTHLY".equalsIgnoreCase(frequency)) {
            return date.getYear() + "-" + String.format("%02d", date.getMonthValue());
        }
        if ("YEARLY".equalsIgnoreCase(frequency)) {
            return String.valueOf(date.getYear());
        }
        return "GLOBAL";
    }

    private String constructVoucherString(VoucherConfig config, String storeCode, LocalDate date, int number) {
        List<String> parts = new ArrayList<>();
        boolean storeAdded = false;
        
        if (config.getPrefix() != null && !config.getPrefix().isEmpty()) {
            parts.add(config.getPrefix());
        }
        
        // Position 1: After Prefix (Default)
        if (Boolean.TRUE.equals(config.getIncludeStoreCode()) && (config.getStoreCodePosition() == null || config.getStoreCodePosition() == 1)) {
            parts.add(storeCode);
            storeAdded = true;
        }
        
        if (Boolean.TRUE.equals(config.getIncludeYear())) {
             if ("YY".equalsIgnoreCase(config.getYearFormat())) {
                parts.add(date.format(DateTimeFormatter.ofPattern("yy")));
            } else {
                parts.add(String.valueOf(date.getYear()));
            }
        }
        
        // Position 2: After Year
        if (Boolean.TRUE.equals(config.getIncludeStoreCode()) && !storeAdded && config.getStoreCodePosition() == 2) {
            parts.add(storeCode);
            storeAdded = true;
        }
        
        if (Boolean.TRUE.equals(config.getIncludeMonth())) {
             parts.add(date.format(DateTimeFormatter.ofPattern(config.getMonthFormat() != null ? config.getMonthFormat() : "MM")));
        }
        
        if (Boolean.TRUE.equals(config.getIncludeDay())) {
             parts.add(date.format(DateTimeFormatter.ofPattern(config.getDayFormat() != null ? config.getDayFormat() : "DD")));
        }
        
        // Position 3: Before Number
        if (Boolean.TRUE.equals(config.getIncludeStoreCode()) && !storeAdded && config.getStoreCodePosition() == 3) {
            parts.add(storeCode);
            storeAdded = true;
        }
        
        String numberFormat = "%0" + (config.getNumberPadding() != null ? config.getNumberPadding() : 4) + "d";
        parts.add(String.format(numberFormat, number));
        
        if (config.getSuffix() != null && !config.getSuffix().isEmpty()) {
            parts.add(config.getSuffix());
        }
        
        return String.join(config.getSeparator() != null ? config.getSeparator() : "-", parts);
    }
}
