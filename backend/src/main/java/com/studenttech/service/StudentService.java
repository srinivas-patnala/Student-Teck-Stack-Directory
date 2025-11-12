package com.studenttech.service;

import com.studenttech.dto.StudentDTO;
import com.studenttech.entity.Student;
import com.studenttech.exception.ResourceNotFoundException;
import com.studenttech.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/**
* Service for Student operations including creating, reading and importing from Excel
*/
@Service
@RequiredArgsConstructor
@Transactional
@Slf4j
public class StudentService {

private final StudentRepository studentRepository;

public List<StudentDTO> getAllStudents() {
return studentRepository.findAll().stream()
.map(this::convertToDTO)
.collect(Collectors.toList());
}

public StudentDTO createStudent(StudentDTO studentDTO) {
    Student student = Student.builder()
            .name(studentDTO.getName())
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();

    if (studentDTO.getTechStacks() != null && !studentDTO.getTechStacks().isEmpty()) {
        String[] arr = studentDTO.getTechStacks().toArray(new String[0]);
        student.setTechStacksFromArray(arr);
    } else {
        student.setTechStacksFromArray(new String[0]);
    }

    Student saved = studentRepository.save(student);
    return convertToDTO(saved);
}
public StudentDTO updateStudent(Long id, StudentDTO studentDTO) {
Student existing = studentRepository.findById(id)
.orElseThrow(() -> new ResourceNotFoundException("Student not found with id " + id));

existing.setName(studentDTO.getName());
if (studentDTO.getTechStacks() != null) {
existing.setTechStacksFromArray(studentDTO.getTechStacks().toArray(new String[0]));
}
existing.setUpdatedAt(LocalDateTime.now());

Student saved = studentRepository.save(existing);
return convertToDTO(saved);
}

public void deleteStudent(Long id) {
Student existing = studentRepository.findById(id)
.orElseThrow(() -> new ResourceNotFoundException("Student not found with id " + id));
studentRepository.delete(existing);
}

public List<String> getAllUniqueTechStacks() {
List<Student> students = studentRepository.findAll();
Set<String> stacks = new TreeSet<>(String.CASE_INSENSITIVE_ORDER);
for (Student s : students) {
String[] arr = s.getTechStacksArray();
for (String t : arr) {
if (t != null && !t.isBlank()) {
stacks.add(t.trim());
}
}
}
    return new ArrayList<>(stacks);
}

public long getStudentCount() {
    return studentRepository.count();
}

public StudentDTO getStudentById(Long id) {
    Student student = studentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with id " + id));
    return convertToDTO(student);
}

public StudentDTO getStudentByName(String name) {
    Student student = studentRepository.findByName(name)
            .orElseThrow(() -> new ResourceNotFoundException("Student not found with name " + name));
    return convertToDTO(student);
}

public List<StudentDTO> searchStudentsByName(String keyword) {
    return studentRepository.findByNameContainingIgnoreCase(keyword).stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
}

public List<StudentDTO> filterStudentsByTechStacks(List<String> techStacks) {
    List<Student> allStudents = studentRepository.findAll();
    return allStudents.stream()
            .filter(student -> {
                List<String> studentTechs = Arrays.asList(student.getTechStacksArray());
                return new HashSet<>(studentTechs).containsAll(techStacks);
            })
            .map(this::convertToDTO)
            .collect(Collectors.toList());
}

public List<StudentDTO> searchStudents(String keyword) {
return studentRepository.searchStudents(keyword).stream()
.map(this::convertToDTO)
.collect(Collectors.toList());
}
/**
* Import students from an uploaded Excel (.xlsx) file.
* Expected: first sheet, header row contains "name" and "tech stacks" (case-insensitive).
* Tech stacks expected to be comma-separated in cell.
*
* @param file multipart file
* @return list of created StudentDTOs
* @throws RuntimeException on parse errors
*/
public List<StudentDTO> importStudentsFromExcel(MultipartFile file) {
List<StudentDTO> created = new ArrayList<>();
try (InputStream in = file.getInputStream();
Workbook workbook = new XSSFWorkbook(in)) {

Sheet sheet = workbook.getSheetAt(0);
if (sheet == null) {
throw new RuntimeException("Excel file is empty or invalid");
}

Iterator<Row> rowIterator = sheet.iterator();
if (!rowIterator.hasNext()) {
throw new RuntimeException("Excel file has no rows");
}

// read header
Row headerRow = rowIterator.next();
Map<String, Integer> headerIndex = new HashMap<>();
for (Cell cell : headerRow) {
String headerVal = cell.getStringCellValue().trim().toLowerCase();
headerIndex.put(headerVal, cell.getColumnIndex());
}

// required headers
if (!headerIndex.containsKey("name") || !headerIndex.containsKey("tech stacks")
&& !headerIndex.containsKey("techstacks") && !headerIndex.containsKey("tech_stack")
) {
// allow slight variations: "tech stacks", "techstacks", "tech_stack"
// but we require a 'name'
if (!headerIndex.containsKey("name")) {
throw new RuntimeException("Excel header must contain a 'Name' column");
}
// if tech stacks header not found explicitly, user might have header 'tech stacks' as single string
}

// figure column index for tech stacks with tolerant match
Integer nameCol = headerIndex.get("name");
Integer techCol = headerIndex.get("tech stacks");
if (techCol == null) {
techCol = headerIndex.get("techstacks");
}
if (techCol == null) {
techCol = headerIndex.get("tech_stack");
}

// parse each data row
while (rowIterator.hasNext()) {
Row row = rowIterator.next();
// skip empty rows
if (row == null) continue;

String name = getCellString(row, nameCol);
if (name == null || name.isBlank()) {
// skip rows without name
continue;
}

String techStacksCell = techCol != null ? getCellString(row, techCol) : "";
List<String> stacks = new ArrayList<>();
if (techStacksCell != null && !techStacksCell.isBlank()) {
String[] parts = techStacksCell.split(",");
for (String p : parts) {
if (!p.isBlank()) stacks.add(p.trim());
}
}

            // create DTO and persist
            StudentDTO dto = StudentDTO.builder()
                    .name(name.trim())
                    .techStacks(stacks)
                    .build();

            StudentDTO createdDto = createStudent(dto);
            created.add(createdDto);
        }
} catch (Exception e) {
log.error("Failed to parse Excel file", e);
throw new RuntimeException("Failed to import Excel file. Error: " + e.getMessage(), e);
}
return created;
}

private String getCellString(Row row, Integer colIndex) {
if (colIndex == null) return "";
Cell cell = row.getCell(colIndex);
if (cell == null) return "";
if (cell.getCellType() == CellType.STRING) {
return cell.getStringCellValue();
} else if (cell.getCellType() == CellType.NUMERIC) {
// convert numeric to string
return Double.toString(cell.getNumericCellValue());
} else if (cell.getCellType() == CellType.BOOLEAN) {
return Boolean.toString(cell.getBooleanCellValue());
} else if (cell.getCellType() == CellType.BLANK) {
return "";
} else {
return cell.toString();
}
}

/**
* Convert Student entity to StudentDTO
*/
private StudentDTO convertToDTO(Student student) {
return StudentDTO.builder()
.id(student.getId())
.name(student.getName())
.techStacks(Arrays.asList(student.getTechStacksArray()))
.createdAt(student.getCreatedAt())
.updatedAt(student.getUpdatedAt())
.build();
}
}
