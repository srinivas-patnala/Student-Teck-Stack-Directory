import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import Swal from 'sweetalert2';
import { Student } from '../../models/student.model';

@Component({
  selector: 'app-student-form',
  templateUrl: './student-form.component.html',
  styleUrls: ['./student-form.component.css']
})
export class StudentFormComponent implements OnInit {
  @Input() student: Student | null = null;
  @Input() availableTechStacks: string[] = [];
  @Output() studentSaved = new EventEmitter<Student>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() studentDeleted = new EventEmitter<number | undefined>();
  @Output() customTechStackAdded = new EventEmitter<string>();

  studentName: string = '';

  selectedTechStacks: { [key: string]: boolean } = {};
  customTechStack: string = '';

  ngOnInit(): void {
    this.selectedTechStacks = {}; // Initialize as an empty object
    if (this.student) {
      this.studentName = this.student.name;
      this.student.techStacks.forEach(tech => {
        this.selectedTechStacks[tech] = true;
      });
    }
  }

  onTechStackChange(techStack: string, isChecked: boolean): void {
    this.selectedTechStacks[techStack] = isChecked;
  }

  addCustomTechStack(): void {
    const trimmed = this.customTechStack.trim();
    if (trimmed && !this.availableTechStacks.includes(trimmed)) {
      this.customTechStackAdded.emit(trimmed);
      this.selectedTechStacks[trimmed] = true;
      this.customTechStack = '';
    }
  }

  onSubmit(): void {
    if (!this.studentName.trim()) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a student name.',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    const selectedTechs = Object.keys(this.selectedTechStacks)
      .filter(key => this.selectedTechStacks[key]);

    if (selectedTechs.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select at least one tech stack.',
        confirmButtonColor: '#667eea'
      });
      return;
    }

    const isUpdate = !!this.student?.id;

    const studentData: Student = {
      id: this.student?.id,
      name: this.studentName.trim(),
      techStacks: selectedTechs
    };

    this.studentSaved.emit(studentData);
    this.resetForm();

    Swal.fire({
      icon: 'success',
      title: isUpdate ? 'Updated Successfully!' : 'Student Added!',
      text: isUpdate 
        ? `${studentData.name}'s details have been updated.`
        : `${studentData.name} has been successfully registered.`,
      showConfirmButton: false,
      timer: 1500,
      customClass: {
        confirmButton: 'btn-success'
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
    this.resetForm();
  }

  resetForm(): void {
    this.studentName = '';
    Object.keys(this.selectedTechStacks).forEach(key => {
      this.selectedTechStacks[key] = false;
    });
    this.customTechStack = '';
  }

  getSelectedCount(): number {
    return Object.values(this.selectedTechStacks).filter(v => v).length;
  }
  
  onDeleteStudent(): void {
    if (!this.student?.id) return;

    Swal.fire({
      title: 'Are you sure?',
      text: `You are about to delete ${this.student.name}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, keep it',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d'
    }).then((result)=> {
      if (result.isConfirmed) {
        this.studentDeleted.emit(this.student?.id); 
        this.cancelled.emit();

        Swal.fire(
          'Deleted!',
          `${this.student?.name} has been deleted.`,
          'success'
        );
      }
    });
  }
}
