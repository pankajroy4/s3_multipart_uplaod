class CreateUploadSessions < ActiveRecord::Migration[8.0]
  def change
    create_table :upload_sessions do |t|
      t.string :filename
      t.string :key
      t.bigint :filesize
      t.string :upload_id
      t.string :status, default: 'in_progress'


      t.timestamps
    end
  end
end
