class UploadSession < ApplicationRecord
  has_many :upload_parts, dependent: :destroy

  enum :status, { in_progress: "in_progress", completed: "completed", aborted: "aborted" }

  def uploaded_part_numbers
    upload_parts.pluck(:part_number)
  end
end