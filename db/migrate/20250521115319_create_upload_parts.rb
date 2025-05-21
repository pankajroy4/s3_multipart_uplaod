class CreateUploadParts < ActiveRecord::Migration[8.0]
  def change
    create_table :upload_parts do |t|
      t.references :upload_session, foreign_key: true
      t.integer :part_number
      t.string :etag

      t.timestamps
    end
  end
end
