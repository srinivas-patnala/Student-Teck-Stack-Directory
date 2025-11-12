import { Component, OnInit } from '@angular/core';
import { StudentService } from '../../services/student.service';
import { Student } from '../../models/student.model';
import Swal from 'sweetalert2';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-student-list',
  templateUrl: './student-list.component.html',
  styleUrls: ['./student-list.component.css']
})
export class StudentListComponent implements OnInit {
  students: Student[] = [];
  filteredStudents: Student[] = [];
  availableTechStacks: string[] = [];
  selectedTechStacks: { [key: string]: boolean } = {};
  editingStudent: Student | null = null;
  showAddForm: boolean = false;
  
  searchQuery: string = '';
  uploading: boolean = false;

  constructor(private studentService: StudentService) { }

  ngOnInit(): void {
    this.loadStudents();
    this.loadTechStacks();
  }

  loadStudents(): void {
    this.studentService.getAllStudents().subscribe(students => {
      this.students = students;
      this.applyFilter();
    });
  }

  loadTechStacks(): void {
    this.studentService.getAllTechStacks().subscribe(techStacks => {
      this.availableTechStacks = techStacks;
      this.availableTechStacks.forEach(tech => {
        if (this.selectedTechStacks[tech] === undefined) {
          this.selectedTechStacks[tech] = false;
        }
        
      });
    });
  }

  onTechStackChange(techStack: string, isChecked: boolean): void {
    this.selectedTechStacks[techStack] = isChecked;
    this.applyFilter();
  }


  applyFilter(): void {
    const selectedTechs = Object.keys(this.selectedTechStacks)
      .filter(key => this.selectedTechStacks[key]);

    const query = this.searchQuery.trim().toLowerCase();

    let result = this.students;

    if (selectedTechs.length > 0) {
      result = result.filter(student =>
        selectedTechs.every(tech =>
          student.techStacks.some(studentTech => studentTech.toLowerCase() === tech.toLowerCase())
        )
      );
    }

    if (query) {
      result = result.filter(student => {
        const nameMatch = student.name.toLowerCase().includes(query);
        const techStackMatch = student.techStacks.some(tech =>
          tech.toLowerCase().includes(query)
        );
        return nameMatch || techStackMatch;
      });
    }

    this.filteredStudents = result;
  }
  
  clearSearch(): void {
    this.searchQuery = '';
    this.applyFilter();
  }

  clearFilters(): void {
    Object.keys(this.selectedTechStacks).forEach(key => {
      this.selectedTechStacks[key] = false;
    });
    this.applyFilter(); 
  }
  
  handleStudentDelete(id: number | undefined): void {
    if(id) {
      this.loadStudents();
      this.loadTechStacks();
    }
  }

  editStudent(student: Student): void {
    this.editingStudent = { ...student };
    this.showAddForm = false;
  }

  cancelForm(): void {
    this.editingStudent = null;
    this.showAddForm = false;
  }

  deleteStudent(id: number | undefined): void {
    if (!id) return;
    
    Swal.fire({
      title: 'Confirm Deletion',
      text: "You are about to permanently remove this student.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result) => {
      if (result.isConfirmed) {
        this.studentService.deleteStudent(id).subscribe({
          next: () => {
            Swal.fire('Deleted!', 'The student profile has been removed.', 'success');
            this.loadStudents();
            this.loadTechStacks();
          },
          error: (err) => {
            Swal.fire('Error', 'Failed to delete student.', 'error');
            console.error(err);
          }
        });
      }
    });
  }

  saveStudent(student: Student): void {
    if (student.id) {
      this.studentService.updateStudent(student.id, student).subscribe(() => {
        this.cancelForm();
        this.loadStudents();
        this.loadTechStacks();
      });
    } else {
      this.studentService.addStudent(student).subscribe(() => {
        this.cancelForm();
        this.loadStudents();
        this.loadTechStacks();
      });
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    this.editingStudent = null;
  }

  addStudent(student: Student): void {
    this.saveStudent(student);
  }

  handleCustomTechStackAdded(tech: string): void {
    if (!this.availableTechStacks.includes(tech)) {
      this.availableTechStacks.push(tech);
    }
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      Swal.fire('Invalid File', 'Please upload a .xlsx Excel file only.', 'warning');
      input.value = '';
      return;
    }

    Swal.fire({
      title: 'Confirm Upload',
      text: `Upload "${file.name}" and import students?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, upload!',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        this.uploading = true;
        Swal.fire({
          title: 'Uploading...',
          text: 'Please wait while the file is being processed.',
          allowOutsideClick: false,
          didOpen: () => {
            Swal.showLoading();
          }
        });

        this.studentService.uploadExcel(file).pipe(
          finalize(() => {
            this.uploading = false;
            input.value = ''; // reset input
          })
        ).subscribe({
          next: (created) => {
            Swal.fire('Success', `Imported ${created.length} students successfully.`, 'success');
            this.loadStudents(); // Re-load to get all data consistently
            this.loadTechStacks();
          },
          error: (err) => {
            console.error(err);
            Swal.fire('Upload Failed', 'Failed to import Excel file: ' + (err.error?.message || err.message || err), 'error');
          }
        });
      }
    });
  }

  getTechStackBadgeClass(techStack: string): string {
    const lowerTech = techStack.toLowerCase();
    if (lowerTech.includes('java')) return 'badge-java';
    if (lowerTech.includes('python')) return 'badge-python';
    if (lowerTech.includes('msb') || lowerTech.includes('spring')) return 'badge-msb';
    if (lowerTech.includes('angular')) return 'badge-angular';
    if (lowerTech.includes('react')) return 'badge-react';
    if (lowerTech.includes('node')) return 'badge-node';
    return 'badge-default';
  }

  getSelectedTechStacksCount(): number {
    return Object.values(this.selectedTechStacks).filter(v => v).length;
  }
}
